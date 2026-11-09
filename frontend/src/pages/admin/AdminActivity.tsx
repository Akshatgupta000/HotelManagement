import { useState } from "react";
import { useQuery } from "react-query";
import * as apiClient from "../../api-client";
import type { AuditLogType, BookingType, ReviewType } from "../../../../shared/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Activity, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

type LegacyItem = {
  id: string;
  at: number;
  kind: "booking" | "review";
  title: string;
  detail: string;
};

const actionColor: Record<string, string> = {
  CHECK_IN: "bg-green-100 text-green-800",
  CHECK_OUT: "bg-blue-100 text-blue-800",
  BOOKING_CREATED: "bg-primary-100 text-primary-800",
  BOOKING_CANCELLED: "bg-red-100 text-red-800",
  ROOM_STATUS_UPDATED: "bg-yellow-100 text-yellow-800",
  booking: "bg-slate-100 text-slate-700",
  review: "bg-purple-100 text-purple-800",
};

const AdminActivity = () => {
  const [auditPage, setAuditPage] = useState(1);

  // Try to fetch real audit logs (admin-only endpoint)
  const {
    data: auditData,
    isLoading: auditLoading,
    isError: auditError,
  } = useQuery(
    ["fetchAuditLogs", auditPage],
    () => apiClient.fetchAuditLogs({ page: auditPage, limit: 30 }),
    { keepPreviousData: true },
  );

  // Fallback: existing bookings + reviews merged
  const { data: bookings } = useQuery(
    "fetchAdminBookings",
    apiClient.fetchAdminBookings,
    { enabled: !!auditError },
  );
  const { data: reviews } = useQuery(
    "fetchAdminReviews",
    apiClient.fetchAdminReviews,
    { enabled: !!auditError },
  );

  // ── Real audit log view ───────────────────────────────────────────────────
  if (!auditError) {
    const logs: AuditLogType[] = auditData?.logs ?? [];
    const pagination = auditData?.pagination;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg md:text-2xl font-medium text-slate-900">
            Audit Log
          </h1>
          <p className="text-sm text-slate-500">
            System events recorded from all staff and admin operations.
          </p>
        </div>

        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-slate-600" />
              Events
              {pagination && (
                <span className="text-slate-400 font-normal">
                  ({pagination.total} total)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                No audit events recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log._id}
                    className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <Badge
                      className={`text-xs mt-0.5 shrink-0 ${
                        actionColor[log.action] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {log.action}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800">
                          {log.resource}
                          {log.resourceId && (
                            <span className="text-slate-400 font-normal ml-1">
                              #{log.resourceId.slice(-6)}
                            </span>
                          )}
                        </span>
                        {log.userEmail && (
                          <span className="text-xs text-slate-500 truncate">
                            by {log.userEmail}
                          </span>
                        )}
                        {log.userRole && (
                          <Badge variant="outline" className="text-xs">
                            {log.userRole}
                          </Badge>
                        )}
                      </div>
                      {log.details && typeof log.details === "object" && (
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="text-sm text-slate-500">
                  Page {auditPage} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAuditPage((p) => Math.min(pagination.pages, p + 1))
                  }
                  disabled={auditPage === pagination.pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Fallback view (legacy bookings + reviews) ──────────────────────────────
  const items: LegacyItem[] = [];
  (bookings as BookingType[] | undefined)?.forEach((b) => {
    items.push({
      id: `b-${b._id}`,
      at: new Date(b.createdAt || b.checkIn).getTime(),
      kind: "booking",
      title: `Booking ${b.status || "pending"} — ${b.firstName} ${b.lastName}`,
      detail: `£${b.totalCost} · check-in ${new Date(b.checkIn).toLocaleDateString()}`,
    });
  });
  (reviews as ReviewType[] | undefined)?.forEach((r) => {
    items.push({
      id: `r-${r._id}`,
      at: new Date(r.createdAt || Date.now()).getTime(),
      kind: "review",
      title: `Review ${r.rating}★`,
      detail: r.comment.slice(0, 120),
    });
  });
  items.sort((a, b) => b.at - a.at);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg md:text-2xl font-medium text-slate-900">
          Activity
        </h1>
        <p className="text-sm text-slate-500">
          Recent bookings and reviews
        </p>
      </div>
      {!items.length ? (
        <p className="text-sm text-slate-500">No recent activity.</p>
      ) : (
        <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {items.slice(0, 50).map((item) => (
            <li key={item.id} className="p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <span className="uppercase font-medium text-slate-500">
                  {item.kind}
                </span>
                <span>{new Date(item.at).toLocaleString()}</span>
              </div>
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="text-sm text-slate-600">{item.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminActivity;
