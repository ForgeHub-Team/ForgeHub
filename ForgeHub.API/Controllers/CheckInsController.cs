using ForgeHub.API.Data;
using ForgeHub.API.DTOs;
using ForgeHub.API.Helpers;
using ForgeHub.API.Models;
using ForgeHub.API.Security;
using ForgeHub.API.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CheckInsController : ControllerBase
{
    private const int MinimumGeofenceRadiusMeters = 50;
    private const int MaximumGeofenceRadiusMeters = 150;
    private readonly ApplicationDbContext _context;
    private readonly ICheckInService _checkInService;
    private readonly ICurrentUser _currentUser;

    public CheckInsController(ApplicationDbContext context, ICheckInService checkInService, ICurrentUser currentUser)
    {
        _context = context;
        _checkInService = checkInService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetCheckIns([FromQuery] long? memberId, [FromQuery] long? branchId)
    {
        var query = ApplyScope(_context.CheckIns.AsQueryable());

        if (memberId.HasValue)
        {
            query = query.Where(c => c.MemberId == memberId.Value);
        }

        if (branchId.HasValue)
        {
            query = query.Where(c => c.BranchId == branchId.Value);
        }

        var checkIns = await query.OrderByDescending(c => c.CheckInTime).ToListAsync();
        return Ok(checkIns);
    }

    [HttpGet("active")]
    [Authorize(Roles = AppRoles.Member)]
    public async Task<IActionResult> GetActiveCheckIn()
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        var member = await _context.Members
            .Where(item => item.UserId == userId && item.IsActive)
            .Select(item => new { item.Id })
            .FirstOrDefaultAsync();

        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var activeCheckIn = await _context.CheckIns
            .Include(item => item.Branch)
            .Where(item => item.MemberId == member.Id && item.CheckOutTime == null)
            .OrderByDescending(item => item.CheckInTime)
            .FirstOrDefaultAsync();

        if (activeCheckIn == null)
        {
            return Ok(new { hasActiveCheckIn = false });
        }

        var checkInTimeUtc = activeCheckIn.CheckInTime?.ToUniversalTime();
        var durationMinutes = checkInTimeUtc.HasValue
            ? Math.Max(0, (int)Math.Floor((DateTime.UtcNow - checkInTimeUtc.Value).TotalMinutes))
            : 0;

        return Ok(new
        {
            hasActiveCheckIn = true,
            checkInId = activeCheckIn.Id,
            branchId = activeCheckIn.BranchId,
            branchName = activeCheckIn.Branch?.Name,
            branchLatitude = activeCheckIn.Branch?.Lat,
            branchLongitude = activeCheckIn.Branch?.Lng,
            radiusMeters = activeCheckIn.Branch?.RangeKm.HasValue == true
                ? Math.Clamp((int)Math.Round(activeCheckIn.Branch.RangeKm.Value * 1000m), MinimumGeofenceRadiusMeters, MaximumGeofenceRadiusMeters)
                : 100,
            checkInTimeUtc,
            durationMinutes,
            status = activeCheckIn.Status
        });
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AttendanceRoles)]
    public async Task<IActionResult> CreateCheckIn([FromBody] CreateCheckInRequest request)
    {
        try
        {
            return Ok(await _checkInService.ManualCheckInAsync(request));
        }
        catch (CheckInValidationException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPost("auto-checkout")]
    [Authorize(Roles = AppRoles.Member)]
    public async Task<IActionResult> AutoCheckOut([FromBody] AutoCheckOutRequest request)
    {
        try
        {
            if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            {
                return Unauthorized();
            }

            var member = await _context.Members.FirstOrDefaultAsync(item => item.UserId == userId);
            if (member == null)
            {
                return BadRequest(new { message = "Member profile not found." });
            }

            var activeCheckIn = await _context.CheckIns
                .Where(item => item.MemberId == member.Id && item.CheckOutTime == null)
                .OrderByDescending(item => item.CheckInTime)
                .FirstOrDefaultAsync();

            if (activeCheckIn == null)
            {
                return Ok(new
                {
                    message = "No active attendance session to close.",
                    checkedOut = false,
                    distanceMeters = (double?)null,
                    radiusMeters = (int?)null,
                    branchId = (long?)null,
                    branchName = (string?)null,
                    checkOutTimeUtc = (DateTime?)null
                });
            }

            var branch = activeCheckIn.BranchId.HasValue
                ? await _context.Branches.FirstOrDefaultAsync(item => item.Id == activeCheckIn.BranchId.Value && item.IsActive)
                : null;

            if (branch == null || !branch.Lat.HasValue || !branch.Lng.HasValue)
            {
                return BadRequest(new { message = "Active attendance branch is missing geofence data." });
            }

            var radiusMeters = branch.RangeKm.HasValue
                ? (int)Math.Round(branch.RangeKm.Value * 1000m)
                : 100;
            radiusMeters = Math.Clamp(radiusMeters, MinimumGeofenceRadiusMeters, MaximumGeofenceRadiusMeters);

            var distanceMeters = CalculateDistanceMeters(
                branch.Lat.Value,
                branch.Lng.Value,
                request.Latitude,
                request.Longitude);

            if (distanceMeters <= radiusMeters)
            {
                var observedAt = request.Timestamp?.ToUniversalTime() ?? DateTime.UtcNow;
                activeCheckIn.LastSeenAt = observedAt;
                _context.AuditLogs.Add(new AuditLog
                {
                    UserId = _currentUser.UserId,
                    Action = "AUTO_CHECK_OUT_STILL_INSIDE",
                    TableName = "check_ins",
                    RecordId = activeCheckIn.Id,
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                return Ok(new
                {
                    message = "Member is still inside the branch radius.",
                    checkedOut = false,
                    distanceMeters = Math.Round(distanceMeters),
                    radiusMeters,
                    branchId = branch.Id,
                    branchName = branch.Name,
                    checkOutTimeUtc = (DateTime?)null
                });
            }

            var checkOutTime = DateTime.UtcNow;
            activeCheckIn.CheckOutTime = checkOutTime;
            activeCheckIn.LastSeenAt = checkOutTime;
            activeCheckIn.Status = AppStatuses.CheckInAutoCheckedOut;
            activeCheckIn.CheckOutMethod = string.IsNullOrWhiteSpace(request.Method) ? "geofence-exit" : request.Method;

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUser.UserId,
                Action = "AUTO_CHECK_OUT",
                TableName = "check_ins",
                RecordId = activeCheckIn.Id,
                CreatedAt = checkOutTime
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Member checked out automatically after leaving the branch geofence.",
                checkedOut = true,
                distanceMeters = Math.Round(distanceMeters),
                radiusMeters,
                branchId = branch.Id,
                branchName = branch.Name,
                checkOutTimeUtc = checkOutTime
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPost("checkout")]
    [Authorize(Roles = AppRoles.Member)]
    public async Task<IActionResult> CheckOut()
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        var member = await _context.Members.FirstOrDefaultAsync(item => item.UserId == userId);
        if (member == null)
        {
            return BadRequest(new { message = "Member profile not found." });
        }

        return Ok(await _checkInService.CheckOutAsync(member.Id, "MOBILE_CHECKOUT"));
    }

    [HttpPost("{id:long}/manual-checkout")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> ManualCheckOut(long id)
    {
        var checkIn = await _context.CheckIns
            .Include(item => item.Branch)
            .FirstOrDefaultAsync(item => item.Id == id && item.CheckOutTime == null);

        if (checkIn == null)
        {
            return NotFound(new { message = "Open check-in not found." });
        }

        if (!CanManageCheckIn(checkIn))
        {
            return Forbid();
        }

        var now = DateTime.UtcNow;
        checkIn.CheckOutTime = now;
        checkIn.LastSeenAt = now;
        checkIn.Status = AppStatuses.CheckInCheckedOut;
        checkIn.CheckOutMethod = "ADMIN_MANUAL_CHECKOUT";

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId,
            Action = "MANUAL_CHECK_OUT",
            TableName = "check_ins",
            RecordId = checkIn.Id,
            CreatedAt = now
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Manual checkout completed.", checkedOut = true, checkOutTime = now });
    }

    private static double CalculateDistanceMeters(
        double lat1,
        double lng1,
        double lat2,
        double lng2)
    {
        const double earthRadiusMeters = 6371000;
        var dLat = DegreesToRadians(lat2 - lat1);
        var dLng = DegreesToRadians(lng2 - lng1);
        var a =
            Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(DegreesToRadians(lat1)) *
            Math.Cos(DegreesToRadians(lat2)) *
            Math.Sin(dLng / 2) *
            Math.Sin(dLng / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusMeters * c;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180d;

    private IQueryable<CheckIn> ApplyScope(IQueryable<CheckIn> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.IsInRole(AppRoles.Member))
        {
            var userId = _currentUser.UserId;
            var memberIds = _context.Members.Where(item => item.UserId == userId).Select(item => item.Id);
            return query.Where(item => item.MemberId.HasValue && memberIds.Contains(item.MemberId.Value));
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return query.Where(item => item.BranchId == _currentUser.BranchId.Value);
        }

        if (_currentUser.GymId.HasValue)
        {
            var branchIds = _context.Branches.Where(item => item.GymId == _currentUser.GymId.Value).Select(item => item.Id);
            return query.Where(item => item.BranchId.HasValue && branchIds.Contains(item.BranchId.Value));
        }

        return query.Where(item => false);
    }

    private bool CanManageCheckIn(CheckIn checkIn)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return true;
        }

        if (checkIn.Branch == null)
        {
            return false;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return _currentUser.GymId.HasValue && checkIn.Branch.GymId == _currentUser.GymId;
        }

        if (_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff))
        {
            return _currentUser.BranchId.HasValue && checkIn.BranchId == _currentUser.BranchId;
        }

        return false;
    }
}
