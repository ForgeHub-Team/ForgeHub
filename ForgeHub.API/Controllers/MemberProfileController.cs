using System.Security.Claims;
using System.Text.RegularExpressions;
using ForgeHub.API.Data;
using ForgeHub.API.DTOs;
using ForgeHub.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/member-profile")]
[Authorize]
public class MemberProfileController : ControllerBase
{
    private static readonly HashSet<string> BloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    private readonly ApplicationDbContext _context;

    public MemberProfileController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var profile = await GetOrCreateProfile(member.Id);
        return Ok(ToDto(profile));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateMemberProfileDto dto)
    {
        var validation = ValidateProfile(dto);
        if (validation.Count > 0)
        {
            return BadRequest(new { message = "Profile validation failed.", errors = validation });
        }

        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var profile = await GetOrCreateProfile(member.Id);
        ApplyUpdate(profile, dto);
        await _context.SaveChangesAsync();

        return Ok(ToDto(profile));
    }

    [HttpGet("insights")]
    public async Task<IActionResult> Insights()
    {
        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var profile = await GetOrCreateProfile(member.Id);
        return Ok(CalculateInsights(member, profile));
    }

    private async Task<Member?> GetCurrentMember()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userId, out var parsedUserId))
        {
            return null;
        }

        return await _context.Members.FirstOrDefaultAsync(item => item.UserId == parsedUserId);
    }

    private async Task<MemberProfile> GetOrCreateProfile(long memberId)
    {
        var profile = await _context.MemberProfiles.FirstOrDefaultAsync(item => item.MemberId == memberId);
        if (profile != null)
        {
            return profile;
        }

        profile = new MemberProfile
        {
            MemberId = memberId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.MemberProfiles.Add(profile);
        await _context.SaveChangesAsync();
        return profile;
    }

    private static MemberProfileDto ToDto(MemberProfile profile) => new()
    {
        MemberId = profile.MemberId,
        HeightCm = profile.HeightCm,
        WeightKg = profile.WeightKg,
        FitnessGoal = profile.FitnessGoal,
        TargetWeightKg = profile.TargetWeightKg,
        BodyFatPercentage = profile.BodyFatPercentage,
        WaistCm = profile.WaistCm,
        ChestCm = profile.ChestCm,
        ShoulderCm = profile.ShoulderCm,
        HipCm = profile.HipCm,
        NeckCm = profile.NeckCm,
        ArmCm = profile.ArmCm,
        ThighCm = profile.ThighCm,
        ActivityLevel = profile.ActivityLevel,
        TrainingExperience = profile.TrainingExperience,
        FavoriteWorkoutType = profile.FavoriteWorkoutType,
        PreferredTrainingDays = profile.PreferredTrainingDays,
        PreferredWorkoutTime = profile.PreferredWorkoutTime,
        BloodType = profile.BloodType,
        MedicalConditions = profile.MedicalConditions,
        Allergies = profile.Allergies,
        Injuries = profile.Injuries,
        Medications = profile.Medications,
        DoctorClearanceRequired = profile.DoctorClearanceRequired,
        HealthNotes = profile.HealthNotes,
        EmergencyContactName = profile.EmergencyContactName,
        EmergencyContactRelationship = profile.EmergencyContactRelationship,
        EmergencyContactPhone = profile.EmergencyContactPhone,
        EmergencyContactAltPhone = profile.EmergencyContactAltPhone,
        DailyCaloriesTarget = profile.DailyCaloriesTarget,
        ProteinTargetGrams = profile.ProteinTargetGrams,
        CarbsTargetGrams = profile.CarbsTargetGrams,
        FatTargetGrams = profile.FatTargetGrams,
        WaterTargetMl = profile.WaterTargetMl,
        Language = profile.Language,
        Theme = profile.Theme,
        MeasurementUnit = profile.MeasurementUnit,
        NotificationsEnabled = profile.NotificationsEnabled,
        ProfilePhotoUrl = profile.ProfilePhotoUrl,
        ProfileCompletionPercentage = profile.ProfileCompletionPercentage,
        CreatedAt = profile.CreatedAt,
        UpdatedAt = profile.UpdatedAt
    };

    private static void ApplyUpdate(MemberProfile profile, UpdateMemberProfileDto dto)
    {
        profile.HeightCm = dto.HeightCm;
        profile.WeightKg = dto.WeightKg;
        profile.FitnessGoal = Trim(dto.FitnessGoal);
        profile.TargetWeightKg = dto.TargetWeightKg;
        profile.BodyFatPercentage = dto.BodyFatPercentage;
        profile.WaistCm = dto.WaistCm;
        profile.ChestCm = dto.ChestCm;
        profile.ShoulderCm = dto.ShoulderCm;
        profile.HipCm = dto.HipCm;
        profile.NeckCm = dto.NeckCm;
        profile.ArmCm = dto.ArmCm;
        profile.ThighCm = dto.ThighCm;
        profile.ActivityLevel = Trim(dto.ActivityLevel);
        profile.TrainingExperience = Trim(dto.TrainingExperience);
        profile.FavoriteWorkoutType = Trim(dto.FavoriteWorkoutType);
        profile.PreferredTrainingDays = Trim(dto.PreferredTrainingDays);
        profile.PreferredWorkoutTime = Trim(dto.PreferredWorkoutTime);
        profile.BloodType = Trim(dto.BloodType);
        profile.MedicalConditions = Trim(dto.MedicalConditions);
        profile.Allergies = Trim(dto.Allergies);
        profile.Injuries = Trim(dto.Injuries);
        profile.Medications = Trim(dto.Medications);
        profile.DoctorClearanceRequired = dto.DoctorClearanceRequired;
        profile.HealthNotes = Trim(dto.HealthNotes);
        profile.EmergencyContactName = Trim(dto.EmergencyContactName);
        profile.EmergencyContactRelationship = Trim(dto.EmergencyContactRelationship);
        profile.EmergencyContactPhone = Trim(dto.EmergencyContactPhone);
        profile.EmergencyContactAltPhone = Trim(dto.EmergencyContactAltPhone);
        profile.DailyCaloriesTarget = dto.DailyCaloriesTarget;
        profile.ProteinTargetGrams = dto.ProteinTargetGrams;
        profile.CarbsTargetGrams = dto.CarbsTargetGrams;
        profile.FatTargetGrams = dto.FatTargetGrams;
        profile.WaterTargetMl = dto.WaterTargetMl;
        profile.Language = Trim(dto.Language);
        profile.Theme = Trim(dto.Theme);
        profile.MeasurementUnit = Trim(dto.MeasurementUnit);
        profile.NotificationsEnabled = dto.NotificationsEnabled;
        profile.ProfilePhotoUrl = Trim(dto.ProfilePhotoUrl);
        profile.UpdatedAt = DateTime.UtcNow;
        profile.ProfileCompletionPercentage = CalculateCompletion(profile);
    }

    private static MemberBodyInsightsDto CalculateInsights(Member member, MemberProfile profile)
    {
        var missing = new List<string>();
        var height = profile.HeightCm;
        var weight = profile.WeightKg;
        decimal? bmi = null;
        decimal? weightToHeight = null;
        string? idealRange = null;
        if (height.HasValue && weight.HasValue && height > 0)
        {
            var meters = height.Value / 100m;
            bmi = Round(weight.Value / (meters * meters));
            weightToHeight = Round(weight.Value / height.Value);
            idealRange = $"{Round(18.5m * meters * meters)} - {Round(24.9m * meters * meters)} kg";
        }
        else
        {
            if (!height.HasValue) missing.Add("heightCm");
            if (!weight.HasValue) missing.Add("weightKg");
        }

        decimal? leanMass = null;
        if (weight.HasValue && profile.BodyFatPercentage.HasValue)
        {
            leanMass = Round(weight.Value * (1 - profile.BodyFatPercentage.Value / 100m));
        }
        else if (!profile.BodyFatPercentage.HasValue)
        {
            missing.Add("bodyFatPercentage");
        }

        decimal? bmr = null;
        decimal? maintenance = null;
        var age = member.Dob.HasValue ? CalculateAge(member.Dob.Value) : (int?)null;
        if (height.HasValue && weight.HasValue && age.HasValue)
        {
            var gender = member.Gender?.Trim().ToLowerInvariant();
            bmr = Round(10m * weight.Value + 6.25m * height.Value - 5m * age.Value + (gender == "female" ? -161m : 5m));
            maintenance = Round(bmr.Value * ActivityFactor(profile.ActivityLevel));
        }
        else if (!age.HasValue)
        {
            missing.Add("dob");
        }

        return new MemberBodyInsightsDto
        {
            Bmi = bmi,
            BodyMassIndex = bmi,
            BmiCategory = bmi.HasValue ? BmiCategory(bmi.Value) : null,
            IdealWeightRange = idealRange,
            BodyFatPercentage = profile.BodyFatPercentage,
            LeanBodyMassKg = leanMass,
            WeightToHeightRatio = weightToHeight,
            ShoulderToWaistRatio = Ratio(profile.ShoulderCm, profile.WaistCm),
            ChestToWaistRatio = Ratio(profile.ChestCm, profile.WaistCm),
            Bmr = bmr,
            MaintenanceCalories = maintenance ?? profile.DailyCaloriesTarget,
            ProteinTargetGrams = profile.ProteinTargetGrams ?? (weight.HasValue ? Round(weight.Value * 1.8m) : null),
            CarbsTargetGrams = profile.CarbsTargetGrams,
            FatTargetGrams = profile.FatTargetGrams,
            WaterTargetMl = profile.WaterTargetMl ?? (weight.HasValue ? Round(weight.Value * 35m) : null),
            MissingFields = missing.Distinct().ToList()
        };
    }

    private static List<string> ValidateProfile(UpdateMemberProfileDto dto)
    {
        var errors = new List<string>();
        AddRange(errors, dto.HeightCm, 80, 250, "heightCm must be between 80 and 250.");
        AddRange(errors, dto.WeightKg, 25, 300, "weightKg must be between 25 and 300.");
        AddRange(errors, dto.TargetWeightKg, 25, 300, "targetWeightKg must be between 25 and 300.");
        AddRange(errors, dto.BodyFatPercentage, 3, 70, "bodyFatPercentage must be between 3 and 70.");
        foreach (var (value, name) in new[]
        {
            (dto.WaistCm, "waistCm"), (dto.ChestCm, "chestCm"), (dto.ShoulderCm, "shoulderCm"),
            (dto.HipCm, "hipCm"), (dto.NeckCm, "neckCm"), (dto.ArmCm, "armCm"), (dto.ThighCm, "thighCm")
        })
        {
            AddRange(errors, value, 1, 300, $"{name} must be positive and reasonable.");
        }

        if (!string.IsNullOrWhiteSpace(dto.BloodType) && !BloodTypes.Contains(dto.BloodType.Trim().ToUpperInvariant()))
        {
            errors.Add("bloodType must be one of A+, A-, B+, B-, AB+, AB-, O+, O-.");
        }

        ValidatePhone(errors, dto.EmergencyContactPhone, "emergencyContactPhone");
        ValidatePhone(errors, dto.EmergencyContactAltPhone, "emergencyContactAltPhone");
        return errors;
    }

    private static void AddRange(List<string> errors, decimal? value, decimal min, decimal max, string message)
    {
        if (value.HasValue && (value.Value < min || value.Value > max))
        {
            errors.Add(message);
        }
    }

    private static void ValidatePhone(List<string> errors, string? value, string field)
    {
        if (!string.IsNullOrWhiteSpace(value) && !Regex.IsMatch(value.Trim(), @"^\+?[0-9\s().-]{7,20}$"))
        {
            errors.Add($"{field} has an invalid phone format.");
        }
    }

    private static decimal? Ratio(decimal? first, decimal? second) =>
        first.HasValue && second.HasValue && second.Value > 0 ? Round(first.Value / second.Value) : null;

    private static decimal Round(decimal value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);

    private static decimal ActivityFactor(string? level) => level?.Trim().ToLowerInvariant() switch
    {
        "light" => 1.375m,
        "moderate" => 1.55m,
        "active" => 1.725m,
        "athlete" => 1.9m,
        _ => 1.2m
    };

    private static string BmiCategory(decimal bmi) => bmi switch
    {
        < 18.5m => "UNDERWEIGHT",
        < 25m => "HEALTHY",
        < 30m => "OVERWEIGHT",
        _ => "OBESE"
    };

    private static int CalculateAge(DateOnly dob)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - dob.Year;
        if (dob > today.AddYears(-age)) age--;
        return age;
    }

    private static decimal CalculateCompletion(MemberProfile profile)
    {
        var values = new object?[]
        {
            profile.HeightCm, profile.WeightKg, profile.FitnessGoal, profile.TargetWeightKg, profile.BodyFatPercentage,
            profile.WaistCm, profile.ChestCm, profile.ActivityLevel, profile.TrainingExperience,
            profile.EmergencyContactName, profile.EmergencyContactPhone, profile.BloodType
        };
        return Round(values.Count(item => item != null && !string.IsNullOrWhiteSpace(item.ToString())) / (decimal)values.Length * 100m);
    }

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
