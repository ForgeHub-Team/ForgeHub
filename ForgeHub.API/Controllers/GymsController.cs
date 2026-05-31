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
public class GymsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public GymsController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetGyms()
    {
        var gyms = await ApplyScope(_context.Gyms.AsQueryable()).OrderBy(g => g.Name).ToListAsync();
        return Ok(gyms);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetGym(long id)
    {
        var gym = await ApplyScope(_context.Gyms.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        return gym == null ? NotFound() : Ok(gym);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> CreateGym([FromBody] CreateGymRequest request)
    {
        try
        {
            var gym = new Gym
            {
                Name = request.Name,
                OwnerUserId = request.OwnerUserId,
                LogoUrl = request.LogoUrl,
                City = request.City,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.Gyms.Add(gym);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetGym), new { id = gym.Id }, gym);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = AppRoles.OwnerRoles)]
    public async Task<IActionResult> UpdateGym(long id, [FromBody] UpdateGymRequest request)
    {
        try
        {
            var gym = await ApplyScope(_context.Gyms.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (gym == null)
            {
                return NotFound();
            }

            gym.Name = request.Name;
            gym.OwnerUserId = request.OwnerUserId;
            gym.LogoUrl = request.LogoUrl;
            gym.City = request.City;
            gym.IsActive = request.IsActive;

            await _context.SaveChangesAsync();
            return Ok(gym);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> DeleteGym(long id)
    {
        try
        {
            var gym = await _context.Gyms.FindAsync(id);
            if (gym == null)
            {
                return NotFound();
            }

            _context.Gyms.Remove(gym);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<Gym> ApplyScope(IQueryable<Gym> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        return _currentUser.GymId.HasValue
            ? query.Where(item => item.Id == _currentUser.GymId.Value)
            : query.Where(item => false);
    }
}
