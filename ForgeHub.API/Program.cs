using System.Text;
using ForgeHub.API.Data;
using ForgeHub.API.Helpers;
using ForgeHub.API.Middleware;
using ForgeHub.API.Security;
using ForgeHub.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var connectionString = builder.Configuration.GetConnectionString("SupabaseConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("ConnectionStrings:SupabaseConnection is required.");
}

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    if (builder.Environment.IsDevelopment())
    {
        jwtKey = "ForgeHub-Development-Jwt-Key-At-Least-32-Characters";
    }
    else
    {
        throw new InvalidOperationException("Jwt:Key is required in production.");
    }
}

if (jwtKey.Length < 32)
{
    throw new InvalidOperationException("Jwt:Key must be at least 32 characters.");
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ForgeHub API",
        Version = "v1",
        Description = "ForgeHub backend connected to Supabase PostgreSQL."
    });

    var jwtSecurityScheme = new OpenApiSecurityScheme
    {
        BearerFormat = "JWT",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = JwtBearerDefaults.AuthenticationScheme,
        Description = "Enter JWT Bearer token",
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id = JwtBearerDefaults.AuthenticationScheme
        }
    };

    options.AddSecurityDefinition(jwtSecurityScheme.Reference.Id, jwtSecurityScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [jwtSecurityScheme] = Array.Empty<string>()
    });
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions => npgsqlOptions.CommandTimeout(30))
        .EnableDetailedErrors()
        .EnableSensitiveDataLogging(builder.Environment.IsDevelopment()));

builder.Services.AddScoped<JwtHelper>();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICheckInService, CheckInService>();
builder.Services.AddScoped<IMemberBranchAccessService, MemberBranchAccessService>();
builder.Services.AddScoped<MemberExperienceService>();
builder.Services.AddSingleton<BranchQrTokenService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "ForgeHub",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "ForgeHubAPI",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AppRoles.SuperAdmin, policy => policy.RequireRole(AppRoles.SuperAdmin));
    options.AddPolicy(AppRoles.GymOwner, policy => policy.RequireRole(AppRoles.GymOwner));
    options.AddPolicy(AppRoles.BranchManager, policy => policy.RequireRole(AppRoles.BranchManager));
    options.AddPolicy(AppRoles.Staff, policy => policy.RequireRole(AppRoles.Staff));
    options.AddPolicy(AppRoles.Trainer, policy => policy.RequireRole(AppRoles.Trainer));
    options.AddPolicy(AppRoles.Member, policy => policy.RequireRole(AppRoles.Member));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        if (await dbContext.Database.CanConnectAsync())
        {
            await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS profile_photo_url text;");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("Profile photo schema check failed: " + ex.Message);
    }
}

var seedDatabase = app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("SeedDatabase");
if (seedDatabase)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    try
    {
        Console.WriteLine("Seeding database...");
        if (await dbContext.Database.CanConnectAsync())
        {
            await DataSeeder.SeedAsync(dbContext);
            Console.WriteLine("Seeding completed.");
        }
        else
        {
            Console.WriteLine("Cannot connect to DB. Skipping seeding.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("Seeding failed: " + ex.Message);
    }
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseSwagger();
app.UseSwaggerUI();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("DevCors");
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<ActiveUserMiddleware>();

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "ForgeHub.API",
    timestamp = DateTime.UtcNow
}));

app.MapControllers();

app.Run();
