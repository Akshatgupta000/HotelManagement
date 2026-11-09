import { useState } from "react";
import { useQuery } from "react-query";
import * as apiClient from "../../api-client";
import { BookingType } from "../../../../shared/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Search, Loader2, Calendar, Users, Home } from "lucide-react";

const statusStyles: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  checked_in: "bg-purple-100 text-purple-800",
  checked_out: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-slate-100 text-slate-800",
  refunded: "bg-gray-100 text-gray-700",
};

const StaffGuestSearch = () => {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery(
    ["staffGuestSearch", searchTerm, "all"],
    () =>
      apiClient.searchStaffGuests({
        query: searchTerm,
        status: "all",
      }),
    { enabled: true },
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
  };

  const bookings: BookingType[] = data?.bookings ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Guest Search</h1>
        <p className="text-slate-500 mt-1">
          Search all reservations by guest name, email, phone, or booking
          reference.
        </p>
      </div>

      {/* Search */}
      <Card className="shadow-sm border-0 bg-white">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <Input
              placeholder="Name, email, phone, or booking reference…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="shrink-0">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="shadow-sm border-0 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-slate-600" />
            Search Results{" "}
            {data && (
              <span className="text-slate-400 font-normal">
                ({data.pagination.total})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              {searchTerm
                ? `No results for "${searchTerm}"`
                : "Enter a search term above to find guests."}
            </p>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking._id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-slate-800">
                          {booking.firstName} {booking.lastName}
                        </span>
                        <Badge
                          className={`text-xs ${
                            statusStyles[booking.status ?? "pending"]
                          }`}
                        >
                          {booking.status ?? "pending"}
                        </Badge>
                        {booking.paymentStatus && (
                          <Badge variant="outline" className="text-xs">
                            {booking.paymentStatus}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{booking.email}</p>
                      {booking.phone && (
                        <p className="text-sm text-slate-500">{booking.phone}</p>
                      )}
                      {booking.bookingReference && (
                        <p className="text-xs font-mono text-primary-600 mt-0.5">
                          {booking.bookingReference}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(booking.checkIn).toLocaleDateString()} →{" "}
                          {new Date(booking.checkOut).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {booking.adultCount}A {booking.childCount}C
                        </span>
                        {booking.roomNumber && (
                          <span className="flex items-center gap-1">
                            <Home className="h-3 w-3" />
                            Room {booking.roomNumber}
                            {booking.roomTypeName
                              ? ` · ${booking.roomTypeName}`
                              : ""}
                          </span>
                        )}
                      </div>
                      {booking.specialRequests && (
                        <p className="text-xs text-slate-400 mt-1 italic">
                          "{booking.specialRequests}"
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <div className="text-sm font-semibold text-slate-700">
                        £{booking.totalCost?.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {booking.paymentMethod ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffGuestSearch;

