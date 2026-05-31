using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ForgeHub.API.Models;

[Table("class_bookings")]
public class ClassBooking
{
    [Key]
    public long Id { get; set; }
    public long? ClassId { get; set; }
    public long? MemberId { get; set; }
    public string? Status { get; set; }
    public DateTime? BookedAt { get; set; }
}
