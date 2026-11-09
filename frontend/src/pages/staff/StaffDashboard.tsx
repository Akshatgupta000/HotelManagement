import { useQuery } from "react-query";
import * as apiClient from "../../api-client";
import { StaffOperationsSummary, BookingType } from "../../../../shared/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  UserCheck,
  UserMinus,
  Users,
  Home,
  Wrench,
  Sparkles,
  Calendar,
  Loader2,
  Clock,
  MapPin,
} from "lucide-react";

const statusColor: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  occupied: "bg-blue-100 text-blue-800",
  maintenance: "bg-orange-100 text-orange-800",
  cleaning: "bg-yellow-100 text-yellow-800",
};

const GuestRow = ({ booking }: { booking: BookingType }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
    <div className="flex-1 min-w-0">
      <p className="font-medium text-slate-800 text-sm truncate">
        {booking.firstName} {booking.lastName}
      </p>
      <p className="text-xs text-slate-500 truncate">{booking.email}</p>
      {booking.bookingReference && (
        <p className="text-xs text-primary-600 font-mono">
          {booking.bookingReference}
        </p>
      )}
    </div>
    <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
      {booking.roomNumber && (
        <Badge variant="outline" className="text-xs">
          Room {booking.roomNumber}
        </Badge>
      )}
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <Clock className="h-3 w-3" />
        {new Date(booking.checkIn).toLocaleDateString()}
        {" → "}
        {new Date(booking.checkOut).toLocaleDateString()}
      </div>
    </div>
  </div>
);

const StaffDashboard = () => {
  const { data, isLoading, error } = useQuery<StaffOperationsSummary>(
    ["staffOperations"],
    () => apiClient.fetchStaffOperations(),
    { refetchInterval: 60_000 }, // auto-refresh every minute
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="text-slate-600">Loading operations data...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-600">Failed to load operations data.</p>
      </div>
    );
  }

  const { todayArrivals, todayDepartures, inHouseGuests, roomStatusCounts } =
    data;

  const kpis = [
    {
      label: "Today's Arrivals",
      value: todayArrivals.length,
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Today's Departures",
      value: todayDepartures.length,
      icon: UserMinus,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "In-House Guests",
      value: inHouseGuests.length,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Available Rooms",
      value: roomStatusCounts.available,
      icon: Home,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Front Desk Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="shadow-sm border-0 bg-white">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-xl ${bg} mb-3`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{value}</div>
              <div className="text-sm text-slate-500 mt-1">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Room Status Rack */}
      <Card className="shadow-sm border-0 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary-600" />
            Room Status Rack ({roomStatusCounts.total} total rooms)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(
              [
                {
                  key: "available",
                  label: "Available",
                  icon: Home,
                },
                {
                  key: "occupied",
                  label: "Occupied",
                  icon: Users,
                },
                {
                  key: "maintenance",
                  label: "Maintenance",
                  icon: Wrench,
                },
                {
                  key: "cleaning",
                  label: "Cleaning",
                  icon: Sparkles,
                },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className={`rounded-xl p-3 text-center ${statusColor[key]}`}
              >
                <Icon className="h-5 w-5 mx-auto mb-1 opacity-70" />
                <div className="text-2xl font-bold">
                  {roomStatusCounts[key]}
                </div>
                <div className="text-xs font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Arrivals + Departures */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Arrivals */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-4 w-4 text-green-600" />
              Today's Arrivals ({todayArrivals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayArrivals.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">
                No arrivals scheduled for today
              </p>
            ) : (
              <div>
                {todayArrivals.map((b) => (
                  <GuestRow key={b._id} booking={b} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Departures */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserMinus className="h-4 w-4 text-blue-600" />
              Today's Departures ({todayDepartures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayDepartures.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">
                No departures scheduled for today
              </p>
            ) : (
              <div>
                {todayDepartures.map((b) => (
                  <GuestRow key={b._id} booking={b} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* In-House Guests */}
      <Card className="shadow-sm border-0 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-purple-600" />
            In-House Guests ({inHouseGuests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inHouseGuests.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">
              No guests currently checked in
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {inHouseGuests.map((b) => (
                <GuestRow key={b._id} booking={b} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDashboard;

