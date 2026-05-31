using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ForgeHub.API.Models;

[Table("trainer_sessions")]
public class TrainerSession
{
    [Key]
    public long Id { get; set; }
    public long? TrainerUserId { get; set; }
    public long? MemberId { get; set; }
    public long? BranchId { get; set; }
    public string? SessionType { get; set; }
    public DateTime? SessionDate { get; set; }
    public string? Notes { get; set; }
}
