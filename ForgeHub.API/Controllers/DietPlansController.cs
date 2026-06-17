using System.Security.Claims;
using ForgeHub.API.Data;
using ForgeHub.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/diet-plans")]
[Authorize]
public class DietPlansController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DietPlansController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member not found." });
        }

        var plans = await _context.DietPlans
            .Where(dp => dp.MemberId == member.Id)
            .OrderByDescending(dp => dp.CreatedAt)
            .ToListAsync();

        return Ok(plans);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DietPlan dto)
    {
        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member not found." });
        }

        var plan = new DietPlan
        {
            MemberId = member.Id,
            Title = dto.Title,
            Description = dto.Description,
            DailyCaloriesTarget = dto.DailyCaloriesTarget,
            ProteinGrams = dto.ProteinGrams,
            CarbsGrams = dto.CarbsGrams,
            FatGrams = dto.FatGrams,
            CreatedAt = DateTime.UtcNow
        };

        _context.DietPlans.Add(plan);
        await _context.SaveChangesAsync();

        return Ok(plan);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member not found." });
        }

        var plan = await _context.DietPlans.FirstOrDefaultAsync(dp => dp.Id == id && dp.MemberId == member.Id);
        if (plan == null)
        {
            return NotFound();
        }

        _context.DietPlans.Remove(plan);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<Member?> GetCurrentMember()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdStr, out var userId)) return null;
        return await _context.Members.FirstOrDefaultAsync(m => m.UserId == userId);
    }
}
