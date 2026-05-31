using ForgeHub.API.Data;
using ForgeHub.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ReportsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("gym/{gymId:long}/summary")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> GetGymSummary(long gymId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        var response = new
        {
            gymId,
            totalMembers = await _context.Members.CountAsync(m => m.GymId == gymId),
            activeMemberships = await _context.MemberMemberships.CountAsync(m => (m.Status == AppStatuses.MembershipActive || m.Status == "Active") && (!m.EndDate.HasValue || m.EndDate >= today)),
            monthlyRevenue = await _context.Payments.Where(p => p.GymId == gymId && p.PaidAt >= monthStart).SumAsync(p => (decimal?)p.Amount) ?? 0m,
            totalBranches = await _context.Branches.CountAsync(b => b.GymId == gymId),
            todayCheckIns = await _context.CheckIns
                .Join(_context.Members, c => c.MemberId, m => m.Id, (c, m) => new { CheckIn = c, Member = m })
                .CountAsync(x => x.Member.GymId == gymId && x.CheckIn.CheckInTime >= DateTime.UtcNow.Date)
        };

        return Ok(response);
    }

    [HttpGet("branch/{branchId:long}/summary")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> GetBranchSummary(long branchId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var response = new
        {
            branchId,
            members = await _context.Members.CountAsync(m => m.HomeBranchId == branchId),
            activeMemberships = await _context.MemberMemberships
                .Join(_context.Members, mm => mm.MemberId, m => m.Id, (mm, m) => new { Membership = mm, Member = m })
                .CountAsync(x => x.Member.HomeBranchId == branchId && (x.Membership.Status == AppStatuses.MembershipActive || x.Membership.Status == "Active") && (!x.Membership.EndDate.HasValue || x.Membership.EndDate >= today)),
            todayRevenue = await _context.Payments.Where(p => p.BranchId == branchId && p.PaidAt >= DateTime.UtcNow.Date).SumAsync(p => (decimal?)p.Amount) ?? 0m,
            todayCheckIns = await _context.CheckIns.CountAsync(c => c.BranchId == branchId && c.CheckInTime >= DateTime.UtcNow.Date),
            upcomingClasses = await _context.Classes.CountAsync(c => c.BranchId == branchId && c.StartTime >= DateTime.UtcNow)
        };

        return Ok(response);
    }
}
