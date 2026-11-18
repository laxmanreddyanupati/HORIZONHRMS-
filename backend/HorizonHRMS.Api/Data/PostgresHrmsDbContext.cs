using Microsoft.EntityFrameworkCore;

namespace HorizonHRMS.Api.Data;

public sealed class PostgresHrmsDbContext(DbContextOptions<PostgresHrmsDbContext> options)
    : HrmsDbContext(options);
