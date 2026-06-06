using ForgeHub.API.Data;
using ForgeHub.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = AppRoles.AdminOperatorRoles + "," + AppRoles.Trainer)]
public class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public DashboardController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetDashboard()
    {
        var todayStart = DateTime.UtcNow.Date;
        var todayEnd = todayStart.AddDays(1);

        var gyms = ApplyGymScope(_context.Gyms.AsQueryable());
        var branches = ApplyBranchScope(_context.Branches.AsQueryable());
        var members = ApplyMemberScope(_context.Members.AsQueryable());
        var payments = ApplyPaymentScope(_context.Payments.AsQueryable());
        var classes = ApplyClassScope(_context.Classes.AsQueryable());
        var checkIns = ApplyCheckInScope(_context.CheckIns.AsQueryable());
        var users = ApplyUserScope(_context.Users.AsQueryable());

        var revenue = await payments.SumAsync(item => item.Amount ?? 0m);
        var todayAttendance = await checkIns.CountAsync(item =>
            item.CheckInTime >= todayStart && item.CheckInTime < todayEnd);
        var activeCheckIns = await checkIns.CountAsync(item => !item.CheckOutTime.HasValue || item.CheckOutTime.Value > DateTime.UtcNow);
        var classBookings = await (
            from booking in _context.ClassBookings
            join gymClass in classes on booking.ClassId equals gymClass.Id
            where booking.Status != AppStatuses.BookingCancelled && booking.Status != "Cancelled"
            select booking.Id).CountAsync();
        var activeMemberships = await (
            from membership in _context.MemberMemberships
            join member in members on membership.MemberId equals member.Id
            where membership.Status == AppStatuses.MembershipActive || membership.Status == "Active"
            select membership.Id).CountAsync();

        var expiringMemberships = await (
            from membership in _context.MemberMemberships
            join member in members on membership.MemberId equals member.Id
            where (membership.Status == AppStatuses.MembershipActive || membership.Status == "Active") &&
                membership.EndDate >= DateOnly.FromDateTime(DateTime.UtcNow) &&
                membership.EndDate <= DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14))
            select membership.Id).CountAsync();

        var result = new
        {
            role = _currentUser.Role,
            scope = new { gymId = _currentUser.GymId, branchId = _currentUser.BranchId },
            kpis = new
            {
                totalGyms = await gyms.CountAsync(),
                activeGyms = await gyms.CountAsync(item => item.IsActive),
                totalBranches = await branches.CountAsync(),
                totalUsers = await users.CountAsync(),
                totalMembers = await members.CountAsync(),
                activeMembers = await members.CountAsync(item => item.IsActive),
                revenue,
                activeCheckIns,
                currentPeopleInsideGym = activeCheckIns,
                todayAttendance,
                classesToday = await classes.CountAsync(item => item.StartTime >= todayStart && item.StartTime < todayEnd),
                classBookings,
                activeMemberships,
                inactiveMembers = await members.CountAsync(item => !item.IsActive),
                expiringMemberships
            },
            generatedAt = DateTime.UtcNow
        };

        return Ok(result);
    }

    private IQueryable<Models.Gym> ApplyGymScope(IQueryable<Models.Gym> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        return _currentUser.GymId.HasValue
            ? query.Where(item => item.Id == _currentUser.GymId.Value)
            : query.Where(item => false);
    }

    private IQueryable<Models.Branch> ApplyBranchScope(IQueryable<Models.Branch> query)
    {
        if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && _currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.Id == _currentUser.BranchId.Value);
        }

        return query;
    }

    private IQueryable<Models.Member> ApplyMemberScope(IQueryable<Models.Member> query)
    {
        if (_currentUser.IsInRole(AppRoles.Trainer))
        {
            var assignedMemberIds = _context.TrainerSessions
                .Where(item => item.TrainerUserId == _currentUser.UserId && item.MemberId.HasValue)
                .Select(item => item.MemberId!.Value);
            return query.Where(item => assignedMemberIds.Contains(item.Id));
        }

        if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && _currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.HomeBranchId == _currentUser.BranchId.Value);
        }

        return query;
    }

    private IQueryable<Models.Payment> ApplyPaymentScope(IQueryable<Models.Payment> query)
    {
        if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && _currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.BranchId == _currentUser.BranchId.Value);
        }

        return query;
    }

    private IQueryable<Models.GymClass> ApplyClassScope(IQueryable<Models.GymClass> query)
    {
        if (_currentUser.IsInRole(AppRoles.Trainer))
        {
            query = query.Where(item => item.TrainerUserId == _currentUser.UserId);
        }
        else if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.BranchId == _currentUser.BranchId.Value);
        }
        else if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && _currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        return query;
    }

    private IQueryable<Models.CheckIn> ApplyCheckInScope(IQueryable<Models.CheckIn> query)
    {
        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.BranchId == _currentUser.BranchId.Value);
        }
        else if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && _currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.Branch != null && item.Branch.GymId == _currentUser.GymId.Value);
        }

        return query;
    }

    private IQueryable<Models.User> ApplyUserScope(IQueryable<Models.User> query)
    {
        if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && _currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue &&
            (_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff) || _currentUser.IsInRole(AppRoles.Trainer)))
        {
            query = query.Where(item => item.BranchId == _currentUser.BranchId.Value || item.BranchId == null);
        }

        return query;
    }
}
