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
        var gyms = await ApplyScope(_context.Gyms.AsQueryable())
            .OrderBy(g => g.Name)
            .ToListAsync();
        var owners = await GetOwnerCandidatesAsync();
        return Ok(gyms.Select(gym => ToGymResponse(gym, owners)).ToList());
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetGym(long id)
    {
        var gym = await ApplyScope(_context.Gyms.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (gym == null)
        {
            return NotFound();
        }

        return Ok(ToGymResponse(gym, await GetOwnerCandidatesAsync()));
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
            return CreatedAtAction(nameof(GetGym), new { id = gym.Id }, ToGymResponse(gym, await GetOwnerCandidatesAsync()));
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
            return Ok(ToGymResponse(gym, await GetOwnerCandidatesAsync()));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPatch("{id:long}/status")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateStatusRequest request)
    {
        var gym = await ApplyScope(_context.Gyms.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (gym == null)
        {
            return NotFound();
        }

        gym.IsActive = request.IsActive;
        await _context.SaveChangesAsync();
        return Ok(ToGymResponse(gym, await GetOwnerCandidatesAsync()));
    }

    [HttpPost("logo")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadLogo([FromForm] IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Please choose a gym photo to upload." });
        }

        var allowedTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        };

        if (!allowedTypes.Contains(file.ContentType))
        {
            return BadRequest(new { message = "Gym photo must be a JPEG, PNG, WebP, or GIF image." });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = file.ContentType.Equals("image/png", StringComparison.OrdinalIgnoreCase) ? ".png" :
                file.ContentType.Equals("image/webp", StringComparison.OrdinalIgnoreCase) ? ".webp" :
                file.ContentType.Equals("image/gif", StringComparison.OrdinalIgnoreCase) ? ".gif" :
                ".jpg";
        }

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var uploadRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "gyms");
        Directory.CreateDirectory(uploadRoot);
        var filePath = Path.Combine(uploadRoot, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        return Ok(new { logoUrl = $"/uploads/gyms/{fileName}" });
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

    private async Task<List<User>> GetOwnerCandidatesAsync()
    {
        var ownerRoleIds = await _context.Roles
            .Where(role => role.Name == AppRoles.GymOwner)
            .Select(role => role.Id)
            .ToListAsync();

        return await _context.Users
            .Where(user => ownerRoleIds.Contains(user.RoleId))
            .OrderBy(user => user.FullName)
            .ToListAsync();
    }

    private static GymResponse ToGymResponse(Gym gym, IReadOnlyCollection<User> owners)
    {
        var owner = gym.OwnerUserId.HasValue
            ? owners.FirstOrDefault(user => user.Id == gym.OwnerUserId.Value)
            : owners.FirstOrDefault(user => user.GymId == gym.Id);

        return new GymResponse
        {
            Id = gym.Id,
            Name = gym.Name,
            OwnerUserId = gym.OwnerUserId ?? owner?.Id,
            OwnerName = string.IsNullOrWhiteSpace(owner?.FullName) ? "Not assigned" : owner.FullName,
            LogoUrl = gym.LogoUrl,
            City = gym.City,
            IsActive = gym.IsActive,
            Status = gym.IsActive ? "Active" : "Inactive",
            CreatedAt = gym.CreatedAt
        };
    }

    private sealed class GymResponse
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public long? OwnerUserId { get; set; }
        public string OwnerName { get; set; } = "Not assigned";
        public string? LogoUrl { get; set; }
        public string? City { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = "Inactive";
        public DateTime? CreatedAt { get; set; }
    }
}
