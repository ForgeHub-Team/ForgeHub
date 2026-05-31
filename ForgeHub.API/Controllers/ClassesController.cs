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
public class ClassesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public ClassesController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetClasses([FromQuery] long? gymId, [FromQuery] long? branchId)
    {
        var query = ApplyScope(_context.Classes.AsQueryable());

        if (gymId.HasValue)
        {
            query = query.Where(c => c.GymId == gymId.Value);
        }

        if (branchId.HasValue)
        {
            query = query.Where(c => c.BranchId == branchId.Value);
        }

        var classes = await query.OrderBy(c => c.StartTime).ToListAsync();
        return Ok(classes);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetClass(long id)
    {
        var gymClass = await ApplyScope(_context.Classes.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        return gymClass == null ? NotFound() : Ok(gymClass);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.SchedulingRoles)]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassRequest request)
    {
        try
        {
            var gymClass = new GymClass
            {
                GymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : _currentUser.GymId,
                BranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                    ? request.BranchId
                    : _currentUser.BranchId,
                TrainerUserId = _currentUser.IsInRole(AppRoles.Trainer) ? _currentUser.UserId : request.TrainerUserId,
                Name = request.Name,
                Capacity = request.Capacity,
                StartTime = request.StartTime,
                EndTime = request.EndTime
            };

            _context.Classes.Add(gymClass);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetClass), new { id = gymClass.Id }, gymClass);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = AppRoles.SchedulingRoles)]
    public async Task<IActionResult> UpdateClass(long id, [FromBody] UpdateClassRequest request)
    {
        try
        {
            var gymClass = await ApplyScope(_context.Classes.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (gymClass == null)
            {
                return NotFound();
            }

            gymClass.GymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : gymClass.GymId;
            gymClass.BranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.BranchId
                : gymClass.BranchId;
            gymClass.TrainerUserId = _currentUser.IsInRole(AppRoles.Trainer) ? _currentUser.UserId : request.TrainerUserId;
            gymClass.Name = request.Name;
            gymClass.Capacity = request.Capacity;
            gymClass.StartTime = request.StartTime;
            gymClass.EndTime = request.EndTime;

            await _context.SaveChangesAsync();
            return Ok(gymClass);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<GymClass> ApplyScope(IQueryable<GymClass> query)
    {
        if (_currentUser.IsInRole(AppRoles.Trainer))
        {
            return query.Where(item => item.TrainerUserId == _currentUser.UserId);
        }

        if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && _currentUser.GymId.HasValue)
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
