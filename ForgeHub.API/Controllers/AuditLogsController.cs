using ForgeHub.API.Data;
using ForgeHub.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = AppRoles.SuperAdmin + "," + AppRoles.GymOwner + "," + AppRoles.BranchManager)]
public class AuditLogsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public AuditLogsController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] long? userId,
        [FromQuery] string? action,
        [FromQuery] string? tableName,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query =
            from log in _context.AuditLogs
            join user in _context.Users on log.UserId equals user.Id into users
            from user in users.DefaultIfEmpty()
            select new
            {
                log.Id,
                log.UserId,
                UserName = user == null ? "System" : user.FullName,
                UserGymId = user == null ? null : user.GymId,
                UserBranchId = user == null ? null : user.BranchId,
                log.Action,
                log.TableName,
                log.RecordId,
                log.CreatedAt
            };

        if (!_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            if (_currentUser.GymId.HasValue)
            {
                query = query.Where(item => item.UserGymId == _currentUser.GymId.Value || item.UserId == _currentUser.UserId);
            }

            if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
            {
                query = query.Where(item => item.UserBranchId == _currentUser.BranchId.Value || item.UserId == _currentUser.UserId);
            }
        }

        if (userId.HasValue)
        {
            query = query.Where(item => item.UserId == userId.Value);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(item => item.Action != null && item.Action.Contains(action));
        }

        if (!string.IsNullOrWhiteSpace(tableName))
        {
            query = query.Where(item => item.TableName == tableName);
        }

        if (from.HasValue)
        {
            query = query.Where(item => item.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(item => item.CreatedAt <= to.Value);
        }

        return Ok(await query
            .OrderByDescending(item => item.CreatedAt)
            .Take(250)
            .ToListAsync());
    }
}
