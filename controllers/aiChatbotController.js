const { GoogleGenerativeAI } = require("@google/generative-ai");
const Venue = require("../models/Venue");
const Court = require("../models/Court");
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const Vacation = require("../models/Vacation");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function for distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Simple parser functions
const parseTimeSlot = (message) => {
  const lowerMsg = message.toLowerCase();
  const pmPattern = /(\d{1,2})\s*pm\s*to\s*(\d{1,2})\s*pm/i;
  const match = lowerMsg.match(pmPattern);

  if (match) {
    let startHour = parseInt(match[1]);
    let endHour = parseInt(match[2]);
    if (startHour < 12) startHour += 12;
    if (endHour < 12) endHour += 12;
    return `${startHour.toString().padStart(2, "0")}:00 - ${endHour.toString().padStart(2, "0")}:00`;
  }
  return null;
};

const parseRadius = (message) => {
  const lowerMsg = message.toLowerCase();
  const match = lowerMsg.match(/(\d+)\s*km/);
  return match ? parseInt(match[1]) : null;
};

const parseSport = (message) => {
  const lowerMsg = message.toLowerCase();
  const sports = ["badminton", "football", "tennis", "cricket", "basketball"];
  for (const sport of sports) {
    if (lowerMsg.includes(sport)) return sport;
  }
  return null;
};

// Main endpoint
exports.aiChatQuery = async (req, res) => {
  try {
    const { message, latitude, longitude } = req.body;

    // Parse the message
    const timeSlot = parseTimeSlot(message);
    const radius = parseRadius(message);
    const sport = parseSport(message);

    // If we have both time and radius
    if (timeSlot && radius) {
      const dateStr = new Date().toISOString().split("T")[0];
      const today = new Date();
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();

      const [startTime] = timeSlot.split(" - ");
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const slotStartInMinutes = startHour * 60 + startMinute;
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const isTodaySlot = slotStartInMinutes > currentTimeInMinutes;

      // Get all active courts
      let courtQuery = { isActive: true };
      if (sport) {
        courtQuery.sportType = { $regex: new RegExp(sport, "i") };
      }

      let courts = await Court.find(courtQuery).populate("venue");
      // Filter by distance (if location provided)
      if (latitude && longitude && radius) {
        courts = courts.filter((court) => {
          if (
            !court.venue.location?.latitude ||
            !court.venue.location?.longitude
          )
            return false;
          const distance = calculateDistance(
            latitude,
            longitude,
            court.venue.location.latitude,
            court.venue.location.longitude,
          );
          return distance <= radius;
        });
      }

      const venues = [];

      for (const court of courts) {
        // Check vacation
        const vacation = await Vacation.findOne({
          venue: court.venue._id,
          startDate: { $lte: dateStr },
          endDate: { $gte: dateStr },
        });

        if (vacation) continue;

        // Check slot availability
        const existingBooking = await Booking.findOne({
          court: court._id,
          date: dateStr,
          "slots.slotString": timeSlot,
          status: { $in: ["PENDING", "CONFIRMED"] },
        });

        const existingSlot = await Slot.findOne({
          court: court._id,
          date: dateStr,
          startTime: startTime,
          endTime: timeSlot.split(" - ")[1],
          isBooked: true,
        });

        const isAvailable = !existingBooking && !existingSlot;
        const isTimeValid =
          dateStr === new Date().toISOString().split("T")[0]
            ? isTodaySlot
            : true;

        if (isAvailable && isTimeValid) {
          const distance =
            latitude && longitude && court.venue.location?.latitude
              ? calculateDistance(
                  latitude,
                  longitude,
                  court.venue.location.latitude,
                  court.venue.location.longitude,
                ).toFixed(1)
              : null;

          venues.push({
            venueId: court.venue._id,
            venueName: court.venue.name,
            venueAddress: court.venue.location?.address,
            courtId: court._id,
            courtName: court.name,
            sportType: court.sportType,
            price: court.pricePerSlot,
            timeSlot: timeSlot,
            distance: distance,
            images: court.venue.images || [],
          });
        }
      }

      if (venues.length === 0) {
        return res.json({
          text: `No venues found with available ${timeSlot} time slot within ${radius}km. Try a different time or increase radius.`,
          showVenues: false,
          suggestions: [
            `Try ${radius + 5}km radius`,
            "Try 7pm to 8pm",
            "Try tomorrow",
          ],
        });
      }

      // Sort by distance
      venues.sort((a, b) => (a.distance || 999) - (b.distance || 999));

      const responseText = `I found ${venues.length} venue(s) with available ${timeSlot} time slot within ${radius}km:`;
      return res.json({
        text: responseText,
        showVenues: true,
        venues: venues,
        suggestions: ["Book now", "Try different time", "Increase radius"],
      });
    }

    // If missing time
    if (!timeSlot && radius) {
      return res.json({
        text: `What time slot are you looking for within ${radius}km? (e.g., 6pm to 7pm)`,
        showVenues: false,
        suggestions: ["6pm to 7pm", "7pm to 8pm", "8pm to 9pm"],
      });
    }

    // If missing radius
    if (timeSlot && !radius) {
      return res.json({
        text: `What radius would you like to search within for ${timeSlot} time slot? (e.g., 5km, 10km)`,
        showVenues: false,
        suggestions: ["5km", "10km", "15km", "20km"],
      });
    }

    // If missing both
    return res.json({
      text: "I can help you find available time slots.\n\nTell me: '6pm to 7pm within 10km'",
      showVenues: false,
      suggestions: [
        "6pm to 7pm within 10km",
        "8pm to 9pm within 5km",
        "7pm to 8pm near me",
      ],
    });
  } catch (error) {
    console.error("❌ ERROR:", error);
    return res.json({
      text: "Please try: '6pm to 7pm within 10km'",
      suggestions: ["6pm to 7pm within 10km", "8pm to 9pm within 5km"],
    });
  }
};
