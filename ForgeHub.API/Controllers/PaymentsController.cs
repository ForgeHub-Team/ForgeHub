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
public class PaymentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public PaymentsController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetPayments([FromQuery] long? gymId, [FromQuery] long? branchId, [FromQuery] long? memberId)
    {
        var query = ApplyScope(_context.Payments.AsQueryable());

        if (gymId.HasValue)
        {
            query = query.Where(p => p.GymId == gymId.Value);
        }

        if (branchId.HasValue)
        {
            query = query.Where(p => p.BranchId == branchId.Value);
        }

        if (memberId.HasValue)
        {
            query = query.Where(p => p.MemberId == memberId.Value);
        }

        var payments = await query
            .Include(payment => payment.Member)
            .Include(payment => payment.Branch)
            .Include(payment => payment.Membership)
                .ThenInclude(membership => membership!.Plan)
            .OrderByDescending(p => p.PaidAt)
            .Select(payment => new AdminPaymentDto
            {
                Id = payment.Id,
                GymId = payment.GymId,
                BranchId = payment.BranchId,
                MemberId = payment.MemberId,
                Member = payment.Member != null ? payment.Member.FullName ?? "Member" : "Member",
                Branch = payment.Branch != null ? payment.Branch.Name : string.Empty,
                Plan = payment.Membership != null && payment.Membership.Plan != null ? payment.Membership.Plan.Name ?? string.Empty : string.Empty,
                AmountValue = payment.Amount,
                Amount = payment.Amount.HasValue ? $"${payment.Amount.Value:0.##}" : "$0",
                Method = payment.Method ?? "Unknown",
                Status = AppStatuses.PaymentPaid,
                At = payment.PaidAt.HasValue ? payment.PaidAt.Value.ToLocalTime().ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) : string.Empty,
                PaidAt = payment.PaidAt,
                Notes = payment.Notes
            })
            .ToListAsync();

        return Ok(payments);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetPayment(long id)
    {
        var payment = await ApplyScope(_context.Payments.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        return payment == null ? NotFound() : Ok(payment);
    }

    [HttpGet("/api/member/payments")]
    [Authorize(Roles = AppRoles.Member)]
    public async Task<IActionResult> GetCurrentMemberPayments()
    {
        var member = await _context.Members.FirstOrDefaultAsync(item => item.UserId == _currentUser.UserId && item.IsActive);
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var payments = await _context.Payments
            .Where(item => item.MemberId == member.Id)
            .OrderByDescending(item => item.PaidAt)
            .Select(item => new
            {
                item.Id,
                item.GymId,
                item.BranchId,
                item.MemberId,
                item.MembershipId,
                amountValue = item.Amount,
                amount = item.Amount.HasValue ? $"${item.Amount.Value:0.##}" : "$0",
                method = item.Method ?? "Payment",
                status = AppStatuses.PaymentPaid,
                item.PaidAt,
                at = item.PaidAt.HasValue ? item.PaidAt.Value.ToString("yyyy-MM-dd HH:mm") : string.Empty,
                item.Notes
            })
            .ToListAsync();

        return Ok(payments);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentRequest request)
    {
        try
        {
            var member = request.MemberId.HasValue
                ? await _context.Members.FirstOrDefaultAsync(item => item.Id == request.MemberId.Value)
                : null;
            if (request.MemberId.HasValue && member == null)
            {
                return NotFound(new { message = "Member not found." });
            }

            if (member != null && !CanAccessMember(member))
            {
                return Forbid();
            }

            var scopedGymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : await ResolveOwnedGymIdAsync(request.GymId ?? member?.GymId);
            var scopedBranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.BranchId ?? member?.HomeBranchId
                : _currentUser.BranchId;

            if (!await IsValidPaymentScopeAsync(scopedGymId, scopedBranchId))
            {
                return BadRequest(new { message = "Invalid gym or branch scope." });
            }

            var payment = new Payment
            {
                GymId = scopedGymId ?? member?.GymId,
                BranchId = scopedBranchId,
                MemberId = request.MemberId,
                MembershipId = request.MembershipId,
                ReceivedByUserId = _currentUser.UserId,
                Amount = request.Amount,
                Method = request.Method,
                PaidAt = request.PaidAt ?? DateTime.UtcNow,
                Notes = request.Notes
            };

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, payment);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> DeletePayment(long id)
    {
        try
        {
            var payment = await ApplyScope(_context.Payments.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (payment == null)
            {
                return NotFound();
            }

            _context.Payments.Remove(payment);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<Payment> ApplyScope(IQueryable<Payment> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            var ownedGymIds = _context.Gyms
                .Where(gym => gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))
                .Select(gym => gym.Id);
            query = query.Where(item => item.GymId.HasValue && ownedGymIds.Contains(item.GymId.Value));
        }
        else if (_currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.BranchId == _currentUser.BranchId.Value);
        }

        return query;
    }

    private bool CanAccessMember(Member member)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return true;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return _context.Gyms.Any(gym => gym.Id == member.GymId && (gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value)));
        }

        if (_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff))
        {
            return _currentUser.BranchId.HasValue && member.HomeBranchId == _currentUser.BranchId.Value;
        }

        return false;
    }

    private async Task<long?> ResolveOwnedGymIdAsync(long? requestedGymId)
    {
        if (!_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return _currentUser.GymId;
        }

        var ownedGymIds = await _context.Gyms
            .Where(gym => gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))
            .Select(gym => gym.Id)
            .ToListAsync();

        if (requestedGymId.HasValue)
        {
            return ownedGymIds.Contains(requestedGymId.Value) ? requestedGymId.Value : null;
        }

        if (_currentUser.GymId.HasValue && ownedGymIds.Contains(_currentUser.GymId.Value))
        {
            return _currentUser.GymId.Value;
        }

        return ownedGymIds.Count == 1 ? ownedGymIds[0] : null;
    }

    private async Task<bool> IsValidPaymentScopeAsync(long? gymId, long? branchId)
    {
        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            if (!gymId.HasValue || !await _context.Gyms.AnyAsync(gym => gym.Id == gymId.Value && (gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))))
            {
                return false;
            }
        }
        else if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && gymId != _currentUser.GymId)
        {
            return false;
        }

        if (!branchId.HasValue)
        {
            return true;
        }

        return await _context.Branches.AnyAsync(branch => branch.Id == branchId.Value && branch.GymId == gymId);
    }
}
