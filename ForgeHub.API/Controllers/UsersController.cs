using BCrypt.Net;
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
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public UsersController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] long? gymId, [FromQuery] long? branchId, [FromQuery] long? roleId)
    {
        var query = ApplyScope(_context.Users.Include(u => u.Role).AsQueryable());

        if (gymId.HasValue)
        {
            query = query.Where(u => u.GymId == gymId.Value);
        }

        if (branchId.HasValue)
        {
            query = query.Where(u => u.BranchId == branchId.Value);
        }

        if (roleId.HasValue)
        {
            query = query.Where(u => u.RoleId == roleId.Value);
        }

        var gyms = await _context.Gyms.ToListAsync();
        var branches = await _context.Branches.ToListAsync();
        var users = await query.OrderBy(u => u.FullName).ToListAsync();
        return Ok(users.Select(user => ToAdminUser(user, gyms, branches)).ToList());
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetUser(long id)
    {
        var user = await ApplyScope(_context.Users.Include(u => u.Role).AsQueryable()).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            return NotFound();
        }

        var gyms = await _context.Gyms.ToListAsync();
        var branches = await _context.Branches.ToListAsync();
        return Ok(ToAdminUser(user, gyms, branches));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        try
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return BadRequest(new { message = "Email already exists." });
            }

            var roleExists = await _context.Roles.AnyAsync(r => r.Id == request.RoleId);
            if (!roleExists)
            {
                return BadRequest(new { message = "Role not found." });
            }

            var requestedRole = await _context.Roles.FirstAsync(r => r.Id == request.RoleId);
            if (!CanAssignRole(requestedRole.Name))
            {
                return Forbid();
            }

            var scopedGymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : _currentUser.GymId;
            var scopedBranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.BranchId
                : _currentUser.BranchId;

            if (!await IsValidUserScopeAsync(scopedGymId, scopedBranchId))
            {
                return BadRequest(new { message = "Invalid gym or branch scope." });
            }

            var user = new User
            {
                GymId = scopedGymId,
                BranchId = scopedBranchId,
                RoleId = request.RoleId,
                FullName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            await SyncGymOwnerAssignmentAsync(user, requestedRole.Name, scopedGymId);
            await _context.SaveChangesAsync();

            var gyms = await _context.Gyms.ToListAsync();
            var branches = await _context.Branches.ToListAsync();
            user.Role = requestedRole;
            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, ToAdminUser(user, gyms, branches));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> UpdateUser(long id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            var user = await ApplyScope(_context.Users.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (user == null)
            {
                return NotFound();
            }

            var requestedRole = await _context.Roles.FirstOrDefaultAsync(r => r.Id == request.RoleId);
            if (requestedRole == null)
            {
                return BadRequest(new { message = "Role not found." });
            }

            if (!await CanManageUserAsync(user) || !CanAssignRole(requestedRole.Name))
            {
                return Forbid();
            }

            var emailInUse = await _context.Users.AnyAsync(u => u.Email == request.Email && u.Id != id);
            if (emailInUse)
            {
                return BadRequest(new { message = "Email already exists." });
            }

            var nextGymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : user.GymId;
            var nextBranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.BranchId
                : user.BranchId;

            if (!await IsValidUserScopeAsync(nextGymId, nextBranchId))
            {
                return BadRequest(new { message = "Invalid gym or branch scope." });
            }

            user.GymId = nextGymId;
            user.BranchId = nextBranchId;
            user.RoleId = request.RoleId;
            user.FullName = request.FullName;
            user.Email = request.Email;
            user.Phone = request.Phone;
            user.IsActive = request.IsActive;

            await SyncGymOwnerAssignmentAsync(user, requestedRole.Name, nextGymId);
            await _context.SaveChangesAsync();

            var gyms = await _context.Gyms.ToListAsync();
            var branches = await _context.Branches.ToListAsync();
            user.Role = requestedRole;
            return Ok(ToAdminUser(user, gyms, branches));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> DeleteUser(long id)
    {
        try
        {
            var user = await ApplyScope(_context.Users.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (user == null)
            {
                return NotFound();
            }

            if (!await CanManageUserAsync(user) || user.Id == _currentUser.UserId)
            {
                return Forbid();
            }

            user.IsActive = false;
            AddAudit("USER_DEACTIVATED", "users", user.Id);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPatch("{id:long}/status")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateStatusRequest request)
    {
        var user = await ApplyScope(_context.Users.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (user == null)
        {
            return NotFound();
        }

        if (!await CanManageUserAsync(user) || (user.Id == _currentUser.UserId && !request.IsActive))
        {
            return Forbid();
        }

        user.IsActive = request.IsActive;
        AddAudit(request.IsActive ? "USER_REACTIVATED" : "USER_DEACTIVATED", "users", user.Id);
        await _context.SaveChangesAsync();
        return Ok(user);
    }

    private IQueryable<User> ApplyScope(IQueryable<User> query)
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
            (_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff) || _currentUser.IsInRole(AppRoles.Trainer)))
        {
            query = query.Where(item => item.BranchId == _currentUser.BranchId.Value || item.BranchId == null);
        }

        return query;
    }

    private bool CanAssignRole(string? roleName)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return true;
        }

        if (string.Equals(roleName, AppRoles.SuperAdmin, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return !string.Equals(roleName, AppRoles.GymOwner, StringComparison.OrdinalIgnoreCase);
        }

        if (_currentUser.IsInRole(AppRoles.BranchManager))
        {
            return string.Equals(roleName, AppRoles.Staff, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(roleName, AppRoles.Trainer, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(roleName, AppRoles.Member, StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }

    private async Task<bool> CanManageUserAsync(User target)
    {
        var roleName = await _context.Roles
            .Where(role => role.Id == target.RoleId)
            .Select(role => role.Name)
            .FirstOrDefaultAsync();

        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return true;
        }

        if (string.Equals(roleName, AppRoles.SuperAdmin, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return _currentUser.GymId.HasValue &&
                target.GymId == _currentUser.GymId.Value &&
                !string.Equals(roleName, AppRoles.GymOwner, StringComparison.OrdinalIgnoreCase);
        }

        if (_currentUser.IsInRole(AppRoles.BranchManager))
        {
            return _currentUser.BranchId.HasValue &&
                target.BranchId == _currentUser.BranchId.Value &&
                CanAssignRole(roleName);
        }

        return false;
    }

    private async Task<bool> IsValidUserScopeAsync(long? gymId, long? branchId)
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

        if (_currentUser.IsInRole(AppRoles.BranchManager))
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

    private async Task SyncGymOwnerAssignmentAsync(User user, string? roleName, long? gymId)
    {
        if (!string.Equals(roleName, AppRoles.GymOwner, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var previousGyms = await _context.Gyms
            .Where(gym => gym.OwnerUserId == user.Id && (!gymId.HasValue || gym.Id != gymId.Value))
            .ToListAsync();

        foreach (var gym in previousGyms)
        {
            gym.OwnerUserId = null;
        }

        if (!gymId.HasValue)
        {
            return;
        }

        var selectedGym = await _context.Gyms.FirstOrDefaultAsync(gym => gym.Id == gymId.Value);
        if (selectedGym != null)
        {
            selectedGym.OwnerUserId = user.Id;
        }
    }

    private static AdminUserDto ToAdminUser(User user, IReadOnlyCollection<Gym> gyms, IReadOnlyCollection<Branch> branches)
    {
        var ownedGym = gyms.FirstOrDefault(gym => gym.OwnerUserId == user.Id);
        var scopedGym = gyms.FirstOrDefault(gym => gym.Id == user.GymId);
        var gymName = scopedGym?.Name ?? ownedGym?.Name ?? "ForgeHub";
        var branchName = branches.FirstOrDefault(branch => branch.Id == user.BranchId)?.Name ?? gymName;
        var roleName = user.Role?.Name ?? string.Empty;

        return new AdminUserDto
        {
            Id = user.Id,
            GymId = user.GymId ?? ownedGym?.Id,
            BranchId = user.BranchId,
            RoleId = user.RoleId,
            Name = user.FullName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            Phone = user.Phone ?? string.Empty,
            Role = roleName,
            Title = roleName,
            Workspace = branchName,
            IsActive = user.IsActive
        };
    }
}
