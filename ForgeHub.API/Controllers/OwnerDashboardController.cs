using ForgeHub.API.Data;
using ForgeHub.API.DTOs;
using ForgeHub.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/owner/dashboard")]
[Authorize(Roles = AppRoles.GymOwner)]
public class OwnerDashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public OwnerDashboardController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<OwnerDashboardDto>> GetDashboard()
    {
        var gymId = await ResolveOwnerGymIdAsync();
        if (!gymId.HasValue)
        {
            return Forbid();
        }

        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var tomorrowStart = todayStart.AddDays(1);
        var last7Start = todayStart.AddDays(-6);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var today = DateOnly.FromDateTime(now);
        var next7 = today.AddDays(7);

        var branches = await _context.Branches
            .Where(branch => branch.GymId == gymId.Value)
            .AsNoTracking()
            .ToListAsync();
        var branchIds = branches.Select(branch => branch.Id).ToHashSet();

        var members = await _context.Members
            .Where(member => member.GymId == gymId.Value)
            .AsNoTracking()
            .ToListAsync();
        var memberIds = members.Select(member => member.Id).ToHashSet();

        var memberships = await _context.MemberMemberships
            .Include(membership => membership.Plan)
            .Where(membership => membership.MemberId.HasValue && memberIds.Contains(membership.MemberId.Value))
            .OrderByDescending(membership => membership.StartDate)
            .ThenByDescending(membership => membership.Id)
            .AsNoTracking()
            .ToListAsync();
        var latestMembershipByMember = memberships
            .GroupBy(membership => membership.MemberId!.Value)
            .ToDictionary(group => group.Key, group => group.First());

        var plans = await _context.MembershipPlans
            .Where(plan => plan.GymId == gymId.Value)
            .AsNoTracking()
            .ToListAsync();

        var payments = await _context.Payments
            .Include(payment => payment.Member)
            .Include(payment => payment.Branch)
            .Include(payment => payment.Membership)
                .ThenInclude(membership => membership!.Plan)
            .Include(payment => payment.ReceivedByUser)
            .Where(payment => payment.GymId == gymId.Value)
            .AsNoTracking()
            .ToListAsync();

        var checkIns = await _context.CheckIns
            .Where(checkIn => checkIn.BranchId.HasValue && branchIds.Contains(checkIn.BranchId.Value))
            .AsNoTracking()
            .ToListAsync();

        var users = await _context.Users
            .Include(user => user.Role)
            .Include(user => user.Branch)
            .Where(user => user.GymId == gymId.Value)
            .AsNoTracking()
            .ToListAsync();
        var employees = await _context.Employees
            .Where(employee => employee.GymId == gymId.Value)
            .AsNoTracking()
            .ToListAsync();

        var branchNameById = branches.ToDictionary(branch => branch.Id, branch => branch.Name);
        var activeMembers = members.Count(member => IsActiveMember(member, latestMembershipByMember.GetValueOrDefault(member.Id), today));
        var expiredMembers = members.Count(member => IsExpiredMember(member, latestMembershipByMember.GetValueOrDefault(member.Id), today));
        var newMembersThisMonth = members.Count(member => member.JoinDate.HasValue && member.JoinDate.Value >= DateOnly.FromDateTime(monthStart));

        var paymentRecords = payments
            .OrderByDescending(payment => payment.PaidAt ?? DateTime.MinValue)
            .Select(payment => new OwnerPaymentRecordDto
            {
                PaymentId = payment.Id,
                MemberName = payment.Member?.FullName ?? "Member",
                Branch = payment.Branch?.Name ?? "Unassigned",
                MembershipPlan = payment.Membership?.Plan?.Name ?? "Unassigned",
                Amount = payment.Amount ?? 0m,
                PaymentMethod = string.IsNullOrWhiteSpace(payment.Method) ? "Unknown" : payment.Method,
                PaidAt = payment.PaidAt,
                RecordedByStaff = payment.ReceivedByUser?.FullName ?? "System"
            })
            .ToList();

        var revenueTrend = Enumerable.Range(0, 7)
            .Select(offset => last7Start.AddDays(offset))
            .Select(day =>
            {
                var nextDay = day.AddDays(1);
                var dayPayments = payments.Where(payment => payment.PaidAt >= day && payment.PaidAt < nextDay).ToList();
                return new OwnerRevenueTrendDto
                {
                    Date = day.ToString("yyyy-MM-dd"),
                    Revenue = dayPayments.Sum(payment => payment.Amount ?? 0m),
                    PaymentCount = dayPayments.Count
                };
            })
            .ToList();

        var branchPerformance = branches.Select(branch =>
        {
            var branchMembers = members.Where(member => member.HomeBranchId == branch.Id).ToList();
            var currentCheckIns = checkIns.Count(checkIn => checkIn.BranchId == branch.Id && (!checkIn.CheckOutTime.HasValue || checkIn.CheckOutTime.Value > now));
            var capacity = branch.Capacity ?? 0;
            var capacityPercent = capacity > 0 ? Math.Round(currentCheckIns * 100m / capacity, 1) : 0m;
            return new OwnerBranchPerformanceDto
            {
                BranchId = branch.Id,
                Branch = branch.Name,
                Revenue = payments.Where(payment => payment.BranchId == branch.Id).Sum(payment => payment.Amount ?? 0m),
                ActiveMembers = branchMembers.Count(member => IsActiveMember(member, latestMembershipByMember.GetValueOrDefault(member.Id), today)),
                ExpiredMembers = branchMembers.Count(member => IsExpiredMember(member, latestMembershipByMember.GetValueOrDefault(member.Id), today)),
                CheckInsToday = checkIns.Count(checkIn => checkIn.BranchId == branch.Id && checkIn.CheckInTime >= todayStart && checkIn.CheckInTime < tomorrowStart),
                Capacity = capacity,
                CurrentCheckIns = currentCheckIns,
                CapacityPercent = capacityPercent,
                Status = CapacityStatus(capacityPercent)
            };
        }).ToList();

        var membersByBranch = branchPerformance.Select(row => new OwnerMembersByBranchDto
        {
            BranchId = row.BranchId,
            Branch = row.Branch,
            TotalMembers = members.Count(member => member.HomeBranchId == row.BranchId),
            ActiveMembers = row.ActiveMembers,
            ExpiredMembers = row.ExpiredMembers,
            NewMembersThisMonth = members.Count(member => member.HomeBranchId == row.BranchId && member.JoinDate.HasValue && member.JoinDate.Value >= DateOnly.FromDateTime(monthStart))
        }).ToList();

        var expiredMemberRecords = members
            .Where(member => IsExpiredMember(member, latestMembershipByMember.GetValueOrDefault(member.Id), today))
            .Select(member =>
            {
                var membership = latestMembershipByMember.GetValueOrDefault(member.Id);
                var expiryDate = membership?.EndDate;
                return new OwnerExpiredMemberDto
                {
                    MemberId = member.Id,
                    MemberName = member.FullName ?? "Member",
                    Phone = member.Phone ?? string.Empty,
                    Branch = member.HomeBranchId.HasValue && branchNameById.TryGetValue(member.HomeBranchId.Value, out var branchName) ? branchName : "Unassigned",
                    MembershipPlan = membership?.Plan?.Name ?? "Unassigned",
                    ExpiryDate = expiryDate,
                    DaysExpired = expiryDate.HasValue ? Math.Max(0, today.DayNumber - expiryDate.Value.DayNumber) : 0,
                    LastCheckIn = checkIns
                        .Where(checkIn => checkIn.MemberId == member.Id)
                        .OrderByDescending(checkIn => checkIn.CheckInTime)
                        .Select(checkIn => checkIn.CheckInTime)
                        .FirstOrDefault()
                };
            })
            .OrderByDescending(member => member.DaysExpired)
            .ToList();

        var paymentCountOverTime = revenueTrend.Select(item => new OwnerPaymentCountTrendDto
        {
            Date = item.Date,
            Count = item.PaymentCount
        }).ToList();

        var planPerformance = plans.Select(plan =>
        {
            var planMembershipIds = memberships.Where(membership => membership.PlanId == plan.Id).Select(membership => membership.Id).ToHashSet();
            var planPayments = payments.Where(payment => payment.MembershipId.HasValue && planMembershipIds.Contains(payment.MembershipId.Value)).ToList();
            return new OwnerPlanPerformanceDto
            {
                PlanId = plan.Id,
                PlanName = plan.Name ?? "Membership Plan",
                Price = plan.Price ?? 0m,
                SalesCount = planPayments.Count,
                TotalRevenue = planPayments.Sum(payment => payment.Amount ?? 0m),
                ActiveMembersUsingPlan = memberships.Count(membership => membership.PlanId == plan.Id && IsActiveMembership(membership, today))
            };
        }).ToList();

        var employeeRows = BuildEmployees(users, employees, branchNameById, payments);
        var expiringSoon = members.Count(member =>
        {
            var membership = latestMembershipByMember.GetValueOrDefault(member.Id);
            return IsActiveMembership(membership, today) && membership?.EndDate >= today && membership.EndDate <= next7;
        });

        return Ok(new OwnerDashboardDto
        {
            RevenueToday = payments.Where(payment => payment.PaidAt >= todayStart && payment.PaidAt < tomorrowStart).Sum(payment => payment.Amount ?? 0m),
            RevenueLast7Days = payments.Where(payment => payment.PaidAt >= last7Start && payment.PaidAt < tomorrowStart).Sum(payment => payment.Amount ?? 0m),
            RevenueThisMonth = payments.Where(payment => payment.PaidAt >= monthStart && payment.PaidAt < tomorrowStart).Sum(payment => payment.Amount ?? 0m),
            ActiveMembers = activeMembers,
            ExpiredMembers = expiredMembers,
            NewMembersThisMonth = newMembersThisMonth,
            RevenueTrend = revenueTrend,
            PaymentRecords = paymentRecords,
            BranchPerformance = branchPerformance,
            MembersByBranch = membersByBranch,
            ActiveVsExpired = new OwnerActiveVsExpiredDto { ActiveMembers = activeMembers, ExpiredMembers = expiredMembers },
            BranchCapacity = branchPerformance.Select(row => new OwnerBranchCapacityDto
            {
                BranchId = row.BranchId,
                Branch = row.Branch,
                CurrentCheckIns = row.CurrentCheckIns,
                Capacity = row.Capacity,
                CapacityPercent = row.CapacityPercent,
                LastUpdated = now
            }).ToList(),
            ExpiredMemberRecords = expiredMemberRecords,
            PaymentsOverview = new OwnerPaymentsOverviewDto
            {
                RevenueByPaymentMethod = payments
                    .GroupBy(payment => string.IsNullOrWhiteSpace(payment.Method) ? "Unknown" : payment.Method)
                    .Select(group => new OwnerRevenueBucketDto { Name = group.Key!, Revenue = group.Sum(payment => payment.Amount ?? 0m), Count = group.Count() })
                    .OrderByDescending(row => row.Revenue)
                    .ToList(),
                RevenueByMembershipPlan = paymentRecords
                    .GroupBy(payment => payment.MembershipPlan)
                    .Select(group => new OwnerRevenueBucketDto { Name = group.Key, Revenue = group.Sum(payment => payment.Amount), Count = group.Count() })
                    .OrderByDescending(row => row.Revenue)
                    .ToList(),
                PaymentCountOverTime = paymentCountOverTime
            },
            PlanPerformance = planPerformance,
            TeamSummary = new OwnerTeamSummaryDto
            {
                TotalManagers = employeeRows.Count(employee => employee.Role.Contains("Manager", StringComparison.OrdinalIgnoreCase)),
                TotalStaff = employeeRows.Count(employee => employee.Role.Equals(AppRoles.Staff, StringComparison.OrdinalIgnoreCase) || employee.Role.Contains("Staff", StringComparison.OrdinalIgnoreCase)),
                TotalTrainers = employeeRows.Count(employee => employee.Role.Equals(AppRoles.Trainer, StringComparison.OrdinalIgnoreCase) || employee.Role.Contains("Trainer", StringComparison.OrdinalIgnoreCase)),
                ActiveEmployees = employeeRows.Count(employee => employee.Status == "Active"),
                InactiveEmployees = employeeRows.Count(employee => employee.Status == "Inactive"),
                Employees = employeeRows
            },
            AttentionItems = BuildAttentionItems(expiringSoon, expiredMembers, branchPerformance, employeeRows)
        });
    }

    private async Task<long?> ResolveOwnerGymIdAsync()
    {
        if (_currentUser.GymId.HasValue)
        {
            return _currentUser.GymId.Value;
        }

        return await _context.Gyms
            .Where(gym => gym.OwnerUserId == _currentUser.UserId)
            .Select(gym => (long?)gym.Id)
            .FirstOrDefaultAsync();
    }

    private static bool IsActiveMembership(Models.MemberMembership? membership, DateOnly today) =>
        membership != null &&
        AppStatuses.IsActiveMembership(membership.Status) &&
        (!membership.EndDate.HasValue || membership.EndDate.Value >= today);

    private static bool IsActiveMember(Models.Member member, Models.MemberMembership? membership, DateOnly today) =>
        member.IsActive && IsActiveMembership(membership, today);

    private static bool IsExpiredMember(Models.Member member, Models.MemberMembership? membership, DateOnly today) =>
        !member.IsActive ||
        membership == null ||
        string.Equals(AppStatuses.NormalizeMembership(membership.Status), AppStatuses.MembershipExpired, StringComparison.Ordinal) ||
        (membership.EndDate.HasValue && membership.EndDate.Value < today);

    private static string CapacityStatus(decimal capacityPercent)
    {
        if (capacityPercent <= 60) return "Normal";
        if (capacityPercent <= 85) return "Busy";
        return "High Capacity";
    }

    private static List<OwnerEmployeeSummaryDto> BuildEmployees(
        List<Models.User> users,
        List<Models.Employee> employees,
        Dictionary<long, string> branchNameById,
        List<Models.Payment> payments)
    {
        var employeeUserIds = employees.Where(employee => employee.UserId.HasValue).Select(employee => employee.UserId!.Value).ToHashSet();
        var teamUsers = users
            .Where(user => user.Role?.Name is AppRoles.BranchManager or AppRoles.Staff or AppRoles.Trainer || employeeUserIds.Contains(user.Id))
            .ToList();

        return teamUsers.Select(user =>
        {
            var employee = employees.FirstOrDefault(item => item.UserId == user.Id);
            var branchId = employee?.BranchId ?? user.BranchId;
            var role = user.Role?.Name ?? employee?.Position ?? "Employee";
            return new OwnerEmployeeSummaryDto
            {
                EmployeeId = user.Id,
                EmployeeName = user.FullName ?? "Employee",
                Role = role,
                Branch = branchId.HasValue && branchNameById.TryGetValue(branchId.Value, out var branchName) ? branchName : "All branches",
                Status = user.IsActive ? "Active" : "Inactive",
                PaymentsRecorded = payments.Count(payment => payment.ReceivedByUserId == user.Id),
                CheckInsHandled = 0
            };
        }).OrderBy(employee => employee.Role).ThenBy(employee => employee.EmployeeName).ToList();
    }

    private static List<OwnerAttentionItemDto> BuildAttentionItems(
        int expiringSoon,
        int expiredMembers,
        List<OwnerBranchPerformanceDto> branches,
        List<OwnerEmployeeSummaryDto> employees)
    {
        var items = new List<OwnerAttentionItemDto>();
        if (expiringSoon > 0)
        {
            items.Add(new OwnerAttentionItemDto { Id = "members-expiring", Type = "members", Title = "Memberships expiring soon", Message = $"{expiringSoon} memberships expire in the next 7 days.", Severity = "warning", Count = expiringSoon });
        }
        if (expiredMembers > 0)
        {
            items.Add(new OwnerAttentionItemDto { Id = "expired-members", Type = "expired-members", Title = "Expired members need follow-up", Message = $"{expiredMembers} expired members need follow-up.", Severity = "danger", Count = expiredMembers });
        }

        var highCapacity = branches.Count(branch => branch.CapacityPercent > 85);
        if (highCapacity > 0)
        {
            items.Add(new OwnerAttentionItemDto { Id = "high-capacity", Type = "capacity", Title = "Branches above 85% capacity", Message = $"{highCapacity} branches are near or at high capacity.", Severity = "warning", Count = highCapacity });
        }

        if (branches.Count > 1)
        {
            var averageRevenue = branches.Average(branch => branch.Revenue);
            var lowRevenue = branches.Count(branch => branch.Revenue < averageRevenue * 0.5m);
            if (lowRevenue > 0)
            {
                items.Add(new OwnerAttentionItemDto { Id = "low-revenue", Type = "branches", Title = "Branches with low revenue", Message = $"{lowRevenue} branches are materially below the gym average.", Severity = "info", Count = lowRevenue });
            }
        }

        var inactiveEmployees = employees.Count(employee => employee.Status == "Inactive");
        if (inactiveEmployees > 0)
        {
            items.Add(new OwnerAttentionItemDto { Id = "inactive-staff", Type = "team", Title = "Inactive staff accounts", Message = $"{inactiveEmployees} team accounts are inactive.", Severity = "warning", Count = inactiveEmployees });
        }

        return items;
    }
}
