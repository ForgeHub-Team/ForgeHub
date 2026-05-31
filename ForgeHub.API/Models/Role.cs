using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ForgeHub.API.Models;

[Table("roles")]
public class Role
{
    [Key]
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
}