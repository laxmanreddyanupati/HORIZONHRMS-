using HorizonHRMS.Api.Contracts;
using HorizonHRMS.Api.Infrastructure;
using HorizonHRMS.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Data;

internal static class StarterEmployees
{
    private const string DepartmentId = "dept-demo-engineering";
    private const string BranchId = "br-demo-hyderabad";
    private const string City = "Hyderabad";
    private const string State = "Telangana";

    public static async Task AddAsync(HrmsDbContext db)
    {
        var starters = new[]
        {
            (Name: "Ram", Slug: "ram", Title: "Java Developer", RoleId: "des-demo-java", Skill: "Java", Birth: new DateOnly(1998, 4, 12)),
            (Name: "Laxman", Slug: "laxman", Title: ".NET Developer", RoleId: "des-demo-dotnet", Skill: "C#", Birth: new DateOnly(1997, 9, 23)),
            (Name: "Noor", Slug: "noor", Title: "DevOps Engineer", RoleId: "des-demo-devops", Skill: "DevOps", Birth: new DateOnly(1999, 2, 15)),
        };
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (!await db.Departments.AnyAsync(item => item.Id == DepartmentId))
        {
            db.Departments.Add(new Department
            {
                Id = DepartmentId,
                Name = "Engineering (Demo)",
                Code = "DEMO-ENG",
                Location = City,
                Email = "engineering@example.com",
                CreatedAt = today,
            });
        }

        if (!await db.Branches.AnyAsync(item => item.Id == BranchId))
        {
            db.Branches.Add(new Branch
            {
                Id = BranchId,
                Name = "Hyderabad Demo Office",
                City = City,
                State = State,
                Address = "Demo office address",
            });
        }

        var staff = await db.Employees.AsNoTracking().Select(item => new { item.Id, item.Email }).ToListAsync();
        var usedEmails = staff.Select(item => item.Email).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var nextId = staff.Select(item => int.TryParse(item.Id.Replace("HZT-", ""), out var number) ? number : 0)
            .DefaultIfEmpty(0).Max() + 1;
        foreach (var (name, slug, title, roleId, skill, birth) in starters)
        {
            if (!await db.Designations.AnyAsync(item => item.Id == roleId))
            {
                db.Designations.Add(new Designation
                {
                    Id = roleId,
                    DepartmentId = DepartmentId,
                    Title = title,
                    Level = "L3",
                    Grade = "L3",
                });
            }

            var email = $"{slug}.demo@example.com";
            if (usedEmails.Contains(email)) continue;

            var employee = new Employee
            {
                Id = $"HZT-{nextId++:0000}",
                ShiftId = "shift-general",
                About = "Fictional starter record for demonstration.",
            };
            employee.ApplyTo(new EmployeeUpsertRequest
            {
                FirstName = name,
                LastName = "Demo",
                PersonalEmail = $"{slug}.personal@example.com",
                Phone = "0000000000",
                Gender = "Other",
                DateOfBirth = birth,
                MaritalStatus = "Single",
                BloodGroup = "O+",
                DepartmentId = DepartmentId,
                DesignationId = roleId,
                BranchId = BranchId,
                EmploymentType = "Full-time",
                Status = "Probation",
                DateOfJoining = today,
                WorkLocation = City,
                Address = new AddressInput
                {
                    Line1 = "Fictional demo address",
                    City = City,
                    State = State,
                    PostalCode = "500001",
                    Country = "India",
                },
                Skills = [skill],
            }, email);
            employee.EmergencyContacts.Add(new EmergencyContact
            {
                Id = $"EC-{Guid.NewGuid():N}",
                EmployeeId = employee.Id,
                Name = "Demo Contact",
                Relationship = "Family",
                Phone = "0000000000",
            });
            employee.EmploymentHistory.Add(new EmploymentHistoryItem
            {
                Id = $"HIS-{Guid.NewGuid():N}",
                EmployeeId = employee.Id,
                Title = "Joined Horizon Technologies",
                Department = "Engineering (Demo)",
                EffectiveFrom = today,
                Type = "Joining",
            });
            db.Employees.Add(employee);
        }

        await db.SaveChangesAsync();
        var emails = starters.Select(item => $"{item.Slug}.demo@example.com").ToArray();
        if (await db.Employees.CountAsync(item => emails.Contains(item.Email)) != starters.Length)
            throw new InvalidOperationException("The three starter employees could not be verified.");
    }
}
