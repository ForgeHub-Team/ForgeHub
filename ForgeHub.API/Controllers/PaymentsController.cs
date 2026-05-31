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

        var payments = await query.OrderByDescending(p => p.PaidAt).ToListAsync();
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
            var payment = new Payment
            {
                GymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : _currentUser.GymId,
                BranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                    ? request.BranchId
                    : _currentUser.BranchId,
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

        if (_currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.BranchId == _currentUser.BranchId.Value);
        }

        return query;
    }
}
