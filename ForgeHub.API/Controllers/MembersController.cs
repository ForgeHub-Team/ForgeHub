using ForgeHub.API.Data;
using ForgeHub.API.DTOs;
using ForgeHub.API.Helpers;
using ForgeHub.API.Models;
using ForgeHub.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MembersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public MembersController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetMembers([FromQuery] long? gymId, [FromQuery] long? branchId, [FromQuery] string? status)
    {
        var query = ApplyScope(_context.Members.AsQueryable());

        if (gymId.HasValue)
        {
            query = query.Where(m => m.GymId == gymId.Value);
        }

        if (branchId.HasValue)
        {
            query = query.Where(m => m.HomeBranchId == branchId.Value);
        }

        var members = await query.OrderBy(m => m.FullName).ToListAsync();
        var memberIds = members.Select(member => member.Id).ToList();
        var branchIds = members.Where(member => member.HomeBranchId.HasValue).Select(member => member.HomeBranchId!.Value).Distinct().ToList();

        var branches = await _context.Branches
            .Where(branch => branchIds.Contains(branch.Id))
            .ToDictionaryAsync(branch => branch.Id, branch => branch.Name);

        var memberships = await _context.MemberMemberships
            .Where(membership => membership.MemberId.HasValue && memberIds.Contains(membership.MemberId.Value))
            .OrderByDescending(membership => membership.StartDate)
            .ToListAsync();

        var plans = await _context.MembershipPlans.ToDictionaryAsync(plan => plan.Id, plan => plan.Name ?? string.Empty);

        var latestPaymentMemberIds = await _context.Payments
            .Where(payment => payment.MemberId.HasValue && memberIds.Contains(payment.MemberId.Value))
            .GroupBy(payment => payment.MemberId!.Value)
            .Select(group => group.Key)
            .ToListAsync();

        var membershipByMember = memberships
            .GroupBy(membership => membership.MemberId!.Value)
            .ToDictionary(group => group.Key, group => group.First());

        var result = members.Select(member =>
        {
            membershipByMember.TryGetValue(member.Id, out var membership);
            var branchName = member.HomeBranchId.HasValue && branches.TryGetValue(member.HomeBranchId.Value, out var name)
                ? name ?? string.Empty
                : string.Empty;

            return new AdminMemberDto
            {
                Id = member.Id,
                GymId = member.GymId,
                BranchId = member.HomeBranchId,
                Name = member.FullName ?? string.Empty,
                Email = member.Email ?? string.Empty,
                Phone = member.Phone ?? string.Empty,
                PlanId = membership?.PlanId is long planId && plans.TryGetValue(planId, out var planName) && !string.IsNullOrWhiteSpace(planName)
                    ? planName
                    : "Unassigned",
                Status = membership?.Status ?? (member.IsActive ? AppStatuses.MembershipActive : "INACTIVE"),
                PaymentStatus = latestPaymentMemberIds.Contains(member.Id) ? AppStatuses.PaymentPaid : AppStatuses.PaymentPending,
                AttendanceToday = "Not checked in",
                JoinedAt = member.JoinDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                MembershipStartDate = membership?.StartDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                MembershipEndDate = membership?.EndDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                IsActive = member.IsActive
            };
        }).Select(member => new
        {
            member.Id,
            member.GymId,
            member.BranchId,
            HomeBranchId = member.BranchId,
            BranchName = member.BranchId.HasValue && branches.TryGetValue(member.BranchId.Value, out var branchName) ? branchName : string.Empty,
            member.Name,
            FullName = member.Name,
            member.Email,
            member.Phone,
            member.PlanId,
            member.TrainerId,
            member.TrainerName,
            member.Status,
            member.PaymentStatus,
            member.AttendanceToday,
            member.JoinedAt,
            member.MembershipStartDate,
            member.MembershipEndDate,
            member.IsActive
        });

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = AppStatuses.Normalize(status);
            result = result.Where(member => AppStatuses.Normalize(member.Status) == normalizedStatus);
        }

        return Ok(result.ToList());
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetMember(long id)
    {
        var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        return member == null ? NotFound() : Ok(member);
    }

    [HttpGet("{id:long}/personal-info")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> GetPersonalInfo(long id)
    {
        var member = await ApplyScope(_context.Members.Include(item => item.Profile)).FirstOrDefaultAsync(item => item.Id == id);
        if (member == null)
        {
            return NotFound();
        }

        var profile = await GetOrCreateProfile(member.Id);
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId,
            Action = "VIEW_MEMBER_PERSONAL_INFO",
            TableName = "member_profiles",
            RecordId = profile.Id,
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        return Ok(ToHealthInfo(profile));
    }

    [HttpPut("{id:long}/personal-info")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> UpdatePersonalInfo(long id, [FromBody] UpdateMemberHealthInfoDto request)
    {
        var errors = ValidateHealthInfo(request);
        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Personal info validation failed.", errors });
        }

        var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (member == null)
        {
            return NotFound();
        }

        var profile = await GetOrCreateProfile(member.Id);
        profile.BloodType = Trim(request.BloodType);
        profile.EmergencyContactName = Trim(request.EmergencyContactName);
        profile.EmergencyContactRelationship = Trim(request.EmergencyContactRelationship);
        profile.EmergencyContactPhone = Trim(request.EmergencyContactPhone);
        profile.EmergencyContactAltPhone = Trim(request.EmergencyContactAltPhone);
        profile.MedicalConditions = Trim(request.MedicalConditions);
        profile.Allergies = Trim(request.Allergies);
        profile.Injuries = Trim(request.Injuries);
        profile.Medications = Trim(request.Medications);
        profile.DoctorClearanceRequired = request.DoctorClearanceRequired;
        profile.HealthNotes = Trim(request.HealthNotes);
        profile.UpdatedAt = DateTime.UtcNow;

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId,
            Action = "UPDATE_MEMBER_PERSONAL_INFO",
            TableName = "member_profiles",
            RecordId = profile.Id,
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        return Ok(ToHealthInfo(profile));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> CreateMember([FromBody] CreateMemberRequest request)
    {
        try
        {
            var scopedGymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : _currentUser.GymId;
            var scopedBranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.HomeBranchId
                : _currentUser.BranchId;

            if (!await IsValidMemberScopeAsync(scopedGymId, scopedBranchId))
            {
                return BadRequest(new { message = "Invalid gym or branch scope." });
            }

            var member = new Member
            {
                GymId = scopedGymId,
                HomeBranchId = scopedBranchId,
                FullName = request.FullName,
                Gender = request.Gender,
                Dob = request.Dob,
                Phone = request.Phone,
                Email = request.Email,
                QrCode = string.IsNullOrWhiteSpace(request.QrCode) ? Guid.NewGuid().ToString("N") : request.QrCode,
                JoinDate = request.JoinDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
                IsActive = request.IsActive
            };

            _context.Members.Add(member);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetMember), new { id = member.Id }, member);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> UpdateMember(long id, [FromBody] UpdateMemberRequest request)
    {
        try
        {
            var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (member == null)
            {
                return NotFound();
            }

            var nextGymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : member.GymId;
            var nextBranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.HomeBranchId
                : member.HomeBranchId;

            if (!await IsValidMemberScopeAsync(nextGymId, nextBranchId))
            {
                return BadRequest(new { message = "Invalid gym or branch scope." });
            }

            member.GymId = nextGymId;
            member.HomeBranchId = nextBranchId;
            member.FullName = request.FullName;
            member.Gender = request.Gender;
            member.Dob = request.Dob;
            member.Phone = request.Phone;
            member.Email = request.Email;
            member.QrCode = request.QrCode ?? member.QrCode;
            member.JoinDate = request.JoinDate ?? member.JoinDate;
            member.IsActive = request.IsActive;

            await _context.SaveChangesAsync();
            return Ok(member);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> DeleteMember(long id)
    {
        try
        {
            var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (member == null)
            {
                return NotFound();
            }

            member.IsActive = false;
            if (member.UserId.HasValue)
            {
                var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == member.UserId.Value);
                if (user != null)
                {
                    user.IsActive = false;
                }
            }

            AddAudit("MEMBER_DEACTIVATED", "members", member.Id);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPatch("{id:long}/status")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateStatusRequest request)
    {
        var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (member == null)
        {
            return NotFound();
        }

        member.IsActive = request.IsActive;
        if (member.UserId.HasValue)
        {
            var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == member.UserId.Value);
            if (user != null)
            {
                user.IsActive = request.IsActive;
            }
        }

        AddAudit(request.IsActive ? "MEMBER_REACTIVATED" : "MEMBER_DEACTIVATED", "members", member.Id);
        await _context.SaveChangesAsync();
        return Ok(member);
    }

    private IQueryable<Member> ApplyScope(IQueryable<Member> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue &&
            !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.HomeBranchId == _currentUser.BranchId.Value);
        }

        if (_currentUser.IsInRole(AppRoles.Member))
        {
            query = query.Where(item => item.UserId == _currentUser.UserId);
        }

        return query;
    }

    private async Task<bool> IsValidMemberScopeAsync(long? gymId, long? branchId)
    {
        if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && gymId != _currentUser.GymId)
        {
            return false;
        }

        if (branchId.HasValue)
        {
            var branchGymId = await _context.Branches
                .Where(branch => branch.Id == branchId.Value)
                .Select(branch => branch.GymId)
                .FirstOrDefaultAsync();

            if (!branchGymId.HasValue || (gymId.HasValue && branchGymId.Value != gymId.Value))
            {
                return false;
            }
        }

        if (!_currentUser.IsInRole(AppRoles.SuperAdmin) &&
            !_currentUser.IsInRole(AppRoles.GymOwner) &&
            _currentUser.BranchId.HasValue)
        {
            return branchId == _currentUser.BranchId;
        }

        return true;
    }

    private void AddAudit(string action, string tableName, long recordId)
    {
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId == 0 ? null : _currentUser.UserId,
            Action = action,
            TableName = tableName,
            RecordId = recordId,
            CreatedAt = DateTime.UtcNow
        });
    }

    private async Task<MemberProfile> GetOrCreateProfile(long memberId)
    {
        var profile = await _context.MemberProfiles.FirstOrDefaultAsync(item => item.MemberId == memberId);
        if (profile != null)
        {
            return profile;
        }

        profile = new MemberProfile
        {
            MemberId = memberId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.MemberProfiles.Add(profile);
        await _context.SaveChangesAsync();
        return profile;
    }

    private static MemberHealthInfoDto ToHealthInfo(MemberProfile profile) => new()
    {
        BloodType = profile.BloodType,
        EmergencyContactName = profile.EmergencyContactName,
        EmergencyContactRelationship = profile.EmergencyContactRelationship,
        EmergencyContactPhone = profile.EmergencyContactPhone,
        EmergencyContactAltPhone = profile.EmergencyContactAltPhone,
        MedicalConditions = profile.MedicalConditions,
        Allergies = profile.Allergies,
        Injuries = profile.Injuries,
        Medications = profile.Medications,
        DoctorClearanceRequired = profile.DoctorClearanceRequired,
        HealthNotes = profile.HealthNotes,
        UpdatedAt = profile.UpdatedAt
    };

    private static List<string> ValidateHealthInfo(MemberHealthInfoDto request)
    {
        var errors = new List<string>();
        var bloodTypes = new HashSet<string> { "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-" };
        if (!string.IsNullOrWhiteSpace(request.BloodType) && !bloodTypes.Contains(request.BloodType.Trim().ToUpperInvariant()))
        {
            errors.Add("bloodType must be one of A+, A-, B+, B-, AB+, AB-, O+, O-.");
        }

        ValidatePhone(errors, request.EmergencyContactPhone, "emergencyContactPhone");
        ValidatePhone(errors, request.EmergencyContactAltPhone, "emergencyContactAltPhone");
        return errors;
    }

    private static void ValidatePhone(List<string> errors, string? value, string field)
    {
        if (!string.IsNullOrWhiteSpace(value) && !System.Text.RegularExpressions.Regex.IsMatch(value.Trim(), @"^\+?[0-9\s().-]{7,20}$"))
        {
            errors.Add($"{field} has an invalid phone format.");
        }
    }

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
