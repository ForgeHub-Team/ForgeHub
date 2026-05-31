# QA Seeding

The development seeder creates the QA/demo dataset automatically when `ForgeHub.API` starts in `Development` or when `SeedDatabase` is enabled.

Run from `ForgeHub.API`:

```powershell
dotnet run
```

Use only local/dev/test databases. Do not run this against production.

All QA users use:

```text
Test@123456
```

## QA Accounts

| Role | Email | Password |
|---|---|---|
| SuperAdmin | qa.superadmin@forgehub.test | Test@123456 |
| GymOwner | qa.owner.ablahfitness@forgehub.test | Test@123456 |
| GymOwner | qa.owner.localgym@forgehub.test | Test@123456 |
| GymOwner | qa.owner.sologym@forgehub.test | Test@123456 |
| BranchManager | qa.manager.ablahmain@forgehub.test | Test@123456 |
| Staff | qa.staff.ablahmain@forgehub.test | Test@123456 |
| Trainer | qa.trainer.elie@forgehub.test | Test@123456 |
| Trainer | qa.trainer.marc@forgehub.test | Test@123456 |
| Trainer | qa.trainer.rana@forgehub.test | Test@123456 |
| Member | qa.member.active.monthly@forgehub.test | Test@123456 |
| Member | qa.member.daypass@forgehub.test | Test@123456 |
| Member | qa.member.3months@forgehub.test | Test@123456 |
| Member | qa.member.vip@forgehub.test | Test@123456 |
| Member | qa.member.expiring2days@forgehub.test | Test@123456 |
| Member | qa.member.expiringtomorrow@forgehub.test | Test@123456 |
| Member | qa.member.expired@forgehub.test | Test@123456 |
| Member | qa.member.frozen@forgehub.test | Test@123456 |
| Member | qa.member.cancelled@forgehub.test | Test@123456 |
| Member | qa.member.noplan@forgehub.test | Test@123456 |
| Member | qa.member.history@forgehub.test | Test@123456 |
| Member | qa.member.running@forgehub.test | Test@123456 |
| Member | qa.member.vip.beirut@forgehub.test | Test@123456 |
| Member | qa.member.gym2.monthly@forgehub.test | Test@123456 |
| Member | qa.member.gym3.solo@forgehub.test | Test@123456 |

## Gyms And Branches

- ForgeHub Ablah Fitness: Ablah Main Branch, Ablah East Branch, Beirut Branch.
- ForgeHub Local Gym: Ablah Strength Branch, Ablah Cardio Branch.
- ForgeHub Solo Gym: Ablah Solo Branch.

## Plans

- Gym 1: QA One Day Pass, QA Monthly Basic, QA 3-Month Standard, QA VIP All Branches, QA Student Plan, QA Frozen Allowed Plan.
- Gym 2: QA Gym2 One Day Pass, QA Monthly Local, QA VIP Local All Branches.
- Gym 3: QA Solo One Day Pass, QA Monthly Solo.

VIP plans are linked to every branch under their gym through `membership_plan_branches`. Branch-specific plans are linked only to their allowed branch.

## Key Member Scenarios

- `qa.member.running@forgehub.test` has an active check-in from about 35 minutes ago.
- `qa.member.vip@forgehub.test` can test all-branch access under ForgeHub Ablah Fitness.
- `qa.member.history@forgehub.test` has old expired memberships plus a current active membership.
- `qa.member.expiring2days@forgehub.test` and `qa.member.expiringtomorrow@forgehub.test` test warning states.
- `qa.member.expired@forgehub.test`, `qa.member.frozen@forgehub.test`, `qa.member.cancelled@forgehub.test`, and `qa.member.noplan@forgehub.test` test blocked or empty membership states.

## Legacy Demo Accounts

The older demo seeder still creates:

| Role | Email | Password |
|---|---|---|
| SuperAdmin | platform@forgehub.com | Forge123! |
| GymOwner | owner@forgehub.com | Forge123! |
| BranchManager | manager@forgehub.com | Forge123! |
| Staff | staff@forgehub.com | Forge123! |
| Trainer | trainer@forgehub.com | Forge123! |
| Member | member1@forgehub.com | P@ssw0rd123! |
