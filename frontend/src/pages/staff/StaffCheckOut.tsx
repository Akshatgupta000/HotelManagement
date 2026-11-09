import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
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
import {
  UserMinus,
  Search,
  Loader2,
  Calendar,
  Users,
  Home,
} from "lucide-react";
import useAppContext from "../../hooks/useAppContext";

const StaffCheckOut = () => {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { showToast } = useAppContext();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ["staffGuestSearch", searchTerm, "checked_in"],
    () =>
      apiClient.searchStaffGuests({
        query: searchTerm,
        status: "checked_in",
      }),
    { enabled: true },
  );

  const { mutate: checkOut, isLoading: isCheckingOut } = useMutation(
    (bookingId: string) => apiClient.checkOutGuest(bookingId),
    {
      onSuccess: () => {
        showToast({
          title: "Check-Out Successful",
          description: "Guest has been checked out. Room assigned for cleaning.",
          type: "SUCCESS",
        });
        queryClient.invalidateQueries(["staffGuestSearch"]);
        queryClient.invalidateQueries(["staffOperations"]);
      },
      onError: () => {
        showToast({
          title: "Check-Out Failed",
          description: "Failed to check out guest. Please try again.",
          type: "ERROR",
        });
      },
    },
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
  };

  const bookings: BookingType[] = data?.bookings ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Guest Check-Out
        </h1>
        <p className="text-slate-500 mt-1">
          Search in-house guests and process departures.
        </p>
      </div>

      {/* Search */}
      <Card className="shadow-sm border-0 bg-white">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <Input
              placeholder="Search by name, email, or booking reference…"
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
            <UserMinus className="h-4 w-4 text-blue-600" />
            In-House Guests{" "}
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
              No guests currently checked in.
            </p>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking._id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">
                        {booking.firstName} {booking.lastName}
                      </span>
                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                        checked_in
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {booking.email}
                    </p>
                    {booking.bookingReference && (
                      <p className="text-xs font-mono text-primary-600 mt-0.5">
                        {booking.bookingReference}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Check-out:{" "}
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
                        </span>
                      )}
                    </div>
                    {booking.checkedInAt && (
                      <p className="text-xs text-slate-400 mt-1">
                        Checked in:{" "}
                        {new Date(booking.checkedInAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => checkOut(booking._id)}
                    disabled={isCheckingOut}
                    className="ml-4 shrink-0 bg-blue-600 hover:bg-blue-700"
                  >
                    {isCheckingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserMinus className="h-4 w-4 mr-1" />
                        Check Out
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffCheckOut;

