using System.Security.Claims;
using ForgeHub.API.Data;
using ForgeHub.API.DTOs;
using ForgeHub.API.Helpers;
using ForgeHub.API.Models;
using ForgeHub.API.Security;
using ForgeHub.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly JwtHelper _jwtHelper;
    private readonly MemberExperienceService _memberExperienceService;
    private readonly IAuthService _authService;

    public AuthController(
        ApplicationDbContext context,
        JwtHelper jwtHelper,
        MemberExperienceService memberExperienceService,
        IAuthService authService)
    {
        _context = context;
        _jwtHelper = jwtHelper;
        _memberExperienceService = memberExperienceService;
        _authService = authService;
    }

    [HttpPost("admin/login")]
    [AllowAnonymous]
    public async Task<IActionResult> AdminLogin([FromBody] AdminLoginDto dto)
    {
        try
        {
            var session = await _authService.LoginAdminAsync(dto);
            return Ok(session);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("member/login")]
    [AllowAnonymous]
    public async Task<IActionResult> MemberLogin([FromBody] MemberLoginDto dto)
    {
        try
        {
            var session = await _authService.LoginMemberAsync(dto);
            return Ok(session);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshSessionDto dto)
    {
        try
        {
            return Ok(await _authService.RefreshAsync(dto.RefreshToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] LogoutDto dto)
    {
        await _authService.LogoutAsync(dto.RefreshToken);
        return NoContent();
    }

    // ================= REGISTER =================
    [HttpPost("register")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Invalid registration data." });

        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            return BadRequest(new { message = "Email already exists." });

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == AppRoles.Member);
        if (role == null)
        {
            role = new Role { Name = AppRoles.Member };
            _context.Roles.Add(role);
            await _context.SaveChangesAsync();
        }

        var user = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            GymId = dto.GymId,
            BranchId = dto.BranchId,
            RoleId = role.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);

        var member = new Member
        {
            GymId = dto.GymId,
            HomeBranchId = dto.BranchId,
            FullName = dto.FullName,
            Phone = dto.Phone,
            Email = dto.Email,
            JoinDate = DateOnly.FromDateTime(DateTime.UtcNow),
            QrCode = $"FH-{Guid.NewGuid():N}"[..14],
            IsActive = true
        };

        _context.Members.Add(member);
        await _context.SaveChangesAsync();
        member.UserId = user.Id;
        await _context.SaveChangesAsync();

        if (!await _context.MemberProfiles.AnyAsync(profile => profile.MemberId == member.Id))
        {
            _context.MemberProfiles.Add(new MemberProfile
            {
                MemberId = member.Id,
                HeightCm = 176m,
                WeightKg = 74m,
                FitnessGoal = "Build strength and improve conditioning",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        var savedUser = await _context.Users
            .Include(u => u.Role)
            .FirstAsync(u => u.Id == user.Id);

        return Ok(await _memberExperienceService.CreateLoginResponseAsync(
            savedUser,
            savedUser.Role!,
            Guid.NewGuid().ToString("N"),
            _jwtHelper));
    }

    // ================= LOGIN =================
    [HttpPost("login")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid login data." });

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || string.IsNullOrWhiteSpace(user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Account is deactivated." });

        if (user.Role == null)
            return StatusCode(500, new { message = "User role not found." });

        if (!string.Equals(user.Role.Name, AppRoles.Member, StringComparison.OrdinalIgnoreCase))
        {
            return Ok(await _memberExperienceService.IssueSessionAsync(user, user.Role, _jwtHelper));
        }

        return Ok(await _memberExperienceService.CreateLoginResponseAsync(
            user,
            user.Role,
            dto.DeviceId,
            _jwtHelper));
    }

    // ================= VERIFY OTP =================
    [HttpPost("verify-otp")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid request." });

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == dto.UserId);

        if (user == null || user.Role == null)
            return NotFound(new { message = "User not found." });

        var valid = await _memberExperienceService.ValidateOtpAsync(dto.UserId, dto.Otp, dto.DeviceId);
        if (!valid)
            return BadRequest(new { message = "Invalid or expired OTP." });

        await _memberExperienceService.ApproveDeviceAsync(dto.UserId, dto.DeviceId);

        return Ok(await _memberExperienceService.IssueSessionAsync(user, user.Role, _jwtHelper));
    }

    // ================= REFRESH SESSION =================
    [HttpPost("device-verify")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> RefreshSession([FromBody] RefreshSessionDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid request." });

        var userId = await _memberExperienceService.ReadRefreshTokenAsync(dto.RefreshToken);
        if (!userId.HasValue)
            return Unauthorized(new { message = "Invalid or expired refresh token." });

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId.Value);

        if (user == null || user.Role == null)
            return Unauthorized(new { message = "User not found." });

        return Ok(await _memberExperienceService.IssueSessionAsync(user, user.Role, _jwtHelper));
    }

    // ================= CURRENT USER =================
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!long.TryParse(userId, out var parsedUserId))
            return Unauthorized();

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == parsedUserId);

        if (user == null)
            return NotFound();

        var member = await _context.Members
            .FirstOrDefaultAsync(m => m.UserId == user.Id);

        var membership = member == null
            ? null
            : await _context.MemberMemberships
                .Include(mm => mm.Plan)
                .FirstOrDefaultAsync(mm => mm.MemberId == member.Id);

        var branchId = user.BranchId ?? member?.HomeBranchId;
        var branch = branchId.HasValue
            ? await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId.Value)
            : null;

        if (string.Equals(user.Role?.Name, AppRoles.Member, StringComparison.OrdinalIgnoreCase) &&
            (branch == null || !branch.Lat.HasValue || !branch.Lng.HasValue || !branch.RangeKm.HasValue))
        {
            return Conflict(new { message = "Member branch location is not configured. Check-in is unavailable until branch geofence data is set." });
        }

        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var remainingDays = membership?.EndDate is null
            ? 0
            : Math.Max(0, membership.EndDate.Value.DayNumber - now.DayNumber);

        var deviceApproved = await _context.DeviceApprovals
            .AnyAsync(item => item.UserId == user.Id && item.IsApproved);

        return Ok(new CurrentUserDto
        {
            Id = user.Id,
            UserId = user.Id,
            MemberId = member?.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName ?? "ForgeHub Member",
            Role = user.Role?.Name ?? AppRoles.Member,
            GymId = user.GymId ?? member?.GymId,
            BranchId = user.BranchId,
            HomeBranchId = member?.HomeBranchId,
            BranchName = branch?.Name ?? string.Empty,
            MembershipActive = AppStatuses.IsActiveMembership(membership?.Status),
            DeviceApproved = deviceApproved,
            MembershipPlan = membership?.Plan?.Name ?? string.Empty,
            MembershipStatus = membership?.Status ?? AppStatuses.MembershipPending,
            RemainingDays = remainingDays,
            GymLatitude = branch?.Lat ?? 0,
            GymLongitude = branch?.Lng ?? 0,
            GeofenceRadiusMeters = (int)Math.Round(((branch?.RangeKm ?? 0m) * 1000m))
        });
    }
}
