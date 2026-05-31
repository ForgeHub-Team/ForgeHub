using System.Security.Claims;
using ForgeHub.API.Security;
using ForgeHub.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/member/branches")]
[Authorize(Roles = AppRoles.Member)]
public class MemberBranchesController : ControllerBase
{
    private readonly IMemberBranchAccessService _service;

    public MemberBranchesController(IMemberBranchAccessService service)
    {
        _service = service;
    }

    [HttpGet("access")]
    public async Task<IActionResult> GetAccess()
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _service.GetAccessibleBranchesForMemberAsync(userId));
    }
}
