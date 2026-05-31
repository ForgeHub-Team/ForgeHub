using ForgeHub.API.Data;
using ForgeHub.API.DTOs;
using ForgeHub.API.Helpers;
using ForgeHub.API.Models;
using ForgeHub.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MembershipPlansController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public MembershipPlansController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetPlans([FromQuery] long? gymId)
    {
        var query = ApplyScope(_context.MembershipPlans.AsQueryable());
        if (gymId.HasValue)
        {
            query = query.Where(p => p.GymId == gymId.Value);
        }

        var plans = await query
            .OrderBy(p => p.Name)
            .ToListAsync();
        var branchIdsByPlan = await LoadPlanBranchIds(plans.Select(plan => plan.Id));
        return Ok(plans.Select(plan => ToResponse(plan, branchIdsByPlan.GetValueOrDefault(plan.Id, []))));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetPlan(long id)
    {
        var plan = await ApplyScope(_context.MembershipPlans.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (plan == null)
        {
            return NotFound();
        }

        var branchIdsByPlan = await LoadPlanBranchIds([plan.Id]);
        return Ok(ToResponse(plan, branchIdsByPlan.GetValueOrDefault(plan.Id, [])));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> CreatePlan([FromBody] CreateMembershipPlanRequest request)
    {
        try
        {
            var plan = new MembershipPlan
            {
                GymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : _currentUser.GymId,
                Name = request.Name,
                Price = request.Price,
                DurationMonths = request.DurationMonths,
                AccessType = request.AccessType,
                IncludesClasses = request.IncludesClasses,
                IncludesPt = request.IncludesPt,
                IsActive = request.IsActive
            };

            _context.MembershipPlans.Add(plan);
            await _context.SaveChangesAsync();
            await SyncPlanBranches(plan, request.BranchIds);
            var branchIdsByPlan = await LoadPlanBranchIds([plan.Id]);
            return CreatedAtAction(nameof(GetPlan), new { id = plan.Id }, ToResponse(plan, branchIdsByPlan.GetValueOrDefault(plan.Id, [])));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> UpdatePlan(long id, [FromBody] UpdateMembershipPlanRequest request)
    {
        try
        {
            var plan = await ApplyScope(_context.MembershipPlans.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (plan == null)
            {
                return NotFound();
            }

            plan.GymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : plan.GymId;
            plan.Name = request.Name;
            plan.Price = request.Price;
            plan.DurationMonths = request.DurationMonths;
            plan.AccessType = request.AccessType;
            plan.IncludesClasses = request.IncludesClasses;
            plan.IncludesPt = request.IncludesPt;
            plan.IsActive = request.IsActive;

            await SyncPlanBranches(plan, request.BranchIds);
            await _context.SaveChangesAsync();
            var branchIdsByPlan = await LoadPlanBranchIds([plan.Id]);
            return Ok(ToResponse(plan, branchIdsByPlan.GetValueOrDefault(plan.Id, [])));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<MembershipPlan> ApplyScope(IQueryable<MembershipPlan> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        return _currentUser.GymId.HasValue
            ? query.Where(item => item.GymId == _currentUser.GymId.Value)
            : query.Where(item => false);
    }

    private async Task SyncPlanBranches(MembershipPlan plan, List<long> branchIds)
    {
        // TODO: Apply sql/2026-05-03-membership-plan-branches.sql in Supabase to enable branch-specific plan access.
        if (!await MembershipPlanBranchesTableExists())
        {
            return;
        }

        var gymId = plan.GymId;
        if (gymId.HasValue && branchIds.Count > 0)
        {
            var allowedIds = await _context.Branches
                .Where(item => item.GymId == gymId.Value && branchIds.Contains(item.Id))
                .Select(item => item.Id)
                .ToListAsync();
            branchIds = allowedIds;
        }

        var existing = await _context.MembershipPlanBranches
            .Where(item => item.MembershipPlanId == plan.Id)
            .ToListAsync();
        _context.MembershipPlanBranches.RemoveRange(existing.Where(item => !branchIds.Contains(item.BranchId)));
        var existingIds = existing.Select(item => item.BranchId).ToHashSet();
        foreach (var branchId in branchIds.Distinct().Where(item => !existingIds.Contains(item)))
        {
            _context.MembershipPlanBranches.Add(new MembershipPlanBranch
            {
                MembershipPlanId = plan.Id,
                BranchId = branchId,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
    }

    private async Task<Dictionary<long, List<long>>> LoadPlanBranchIds(IEnumerable<long> planIds)
    {
        var ids = planIds.Distinct().ToList();
        if (ids.Count == 0 || !await MembershipPlanBranchesTableExists())
        {
            return [];
        }

        var rows = await _context.MembershipPlanBranches
            .Where(item => ids.Contains(item.MembershipPlanId))
            .ToListAsync();

        return rows
            .GroupBy(item => item.MembershipPlanId)
            .ToDictionary(group => group.Key, group => group.Select(item => item.BranchId).ToList());
    }

    private async Task<bool> MembershipPlanBranchesTableExists()
    {
        try
        {
            _ = await _context.MembershipPlanBranches.Take(1).ToListAsync();
            return true;
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            return false;
        }
    }

    private static object ToResponse(MembershipPlan plan, List<long> branchIds) => new
    {
        plan.Id,
        plan.GymId,
        plan.Name,
        plan.Price,
        plan.DurationMonths,
        plan.AccessType,
        plan.IncludesClasses,
        plan.IncludesPt,
        plan.IsActive,
        BranchIds = branchIds
    };
}
