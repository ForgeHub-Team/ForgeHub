using ForgeHub.API.Data;
using ForgeHub.API.DTOs;
using ForgeHub.API.Helpers;
using ForgeHub.API.Models;
using ForgeHub.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MemberMembershipsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MemberMembershipsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetMemberships([FromQuery] long? memberId)
    {
        var query = _context.MemberMemberships.AsQueryable();

        if (memberId.HasValue)
        {
            query = query.Where(m => m.MemberId == memberId.Value);
        }

        var memberships = await query.OrderByDescending(m => m.StartDate).ToListAsync();
        return Ok(memberships);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetMembership(long id)
    {
        var membership = await _context.MemberMemberships.FindAsync(id);
        return membership == null ? NotFound() : Ok(membership);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,GymOwner,BranchManager,Staff")]
    public async Task<IActionResult> CreateMembership([FromBody] CreateMemberMembershipRequest request)
    {
        try
        {
            if (request.MemberId.HasValue && !await _context.Members.AnyAsync(m => m.Id == request.MemberId.Value))
            {
                return BadRequest(new { message = "Member not found." });
            }

            MembershipPlan? plan = null;
            if (request.PlanId.HasValue)
            {
                plan = await _context.MembershipPlans.FindAsync(request.PlanId.Value);
                if (plan == null)
                {
                    return BadRequest(new { message = "Membership plan not found." });
                }
            }

            var startDate = request.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var membership = new MemberMembership
            {
                MemberId = request.MemberId,
                PlanId = request.PlanId,
                StartDate = startDate,
                EndDate = request.EndDate ?? (plan?.DurationMonths is > 0 ? startDate.AddMonths(plan.DurationMonths.Value) : null),
                Status = AppStatuses.NormalizeMembership(request.Status ?? AppStatuses.MembershipActive),
                FreezeDays = request.FreezeDays ?? 0
            };

            _context.MemberMemberships.Add(membership);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetMembership), new { id = membership.Id }, membership);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = "SuperAdmin,GymOwner,BranchManager,Staff")]
    public async Task<IActionResult> UpdateMembership(long id, [FromBody] UpdateMemberMembershipRequest request)
    {
        try
        {
            var membership = await _context.MemberMemberships.FindAsync(id);
            if (membership == null)
            {
                return NotFound();
            }

            membership.MemberId = request.MemberId;
            membership.PlanId = request.PlanId;
            membership.StartDate = request.StartDate;
            membership.EndDate = request.EndDate;
            membership.Status = AppStatuses.NormalizeMembership(request.Status);
            membership.FreezeDays = request.FreezeDays ?? membership.FreezeDays;

            await _context.SaveChangesAsync();
            return Ok(membership);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }
}
