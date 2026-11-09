import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import * as apiClient from "../../api-client";
import type {
  HotelType,
  RoomTypeType,
  RoomModelType,
  RoomStatusType,
} from "../../../../shared/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Hotel,
  Plus,
  Loader2,
  Home,
  Wrench,
  Sparkles,
  Users,
  ChevronDown,
} from "lucide-react";
import useAppContext from "../../hooks/useAppContext";

const statusStyles: Record<RoomStatusType, string> = {
  available: "bg-green-100 text-green-800",
  occupied: "bg-blue-100 text-blue-800",
  maintenance: "bg-orange-100 text-orange-800",
  cleaning: "bg-yellow-100 text-yellow-800",
};

const statusIcons: Record<RoomStatusType, React.ReactNode> = {
  available: <Home className="h-3 w-3" />,
  occupied: <Users className="h-3 w-3" />,
  maintenance: <Wrench className="h-3 w-3" />,
  cleaning: <Sparkles className="h-3 w-3" />,
};

const AdminRooms = () => {
  const { showToast } = useAppContext();
  const queryClient = useQueryClient();

  // Which hotel is selected
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  // Which room type is expanded to show its rooms
  const [expandedRoomTypeId, setExpandedRoomTypeId] = useState<string | null>(
    null,
  );

  // Forms state
  const [showRTForm, setShowRTForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState<string | null>(null); // roomTypeId
  const [rtForm, setRtForm] = useState({
    name: "",
    code: "",
    description: "",
    basePrice: "",
    maxAdults: "2",
    maxChildren: "1",
    bedConfiguration: "",
    amenities: "",
  });
  const [roomForm, setRoomForm] = useState({
    roomNumber: "",
    floor: "1",
  });

  // Fetch all hotels for the selector
  const { data: hotelsData } = useQuery<HotelType[]>(
    "fetchHotels",
    apiClient.fetchHotels,
  );
  const hotels: HotelType[] = hotelsData ?? [];

  // Fetch room types for selected hotel
  const { data: roomTypes, isLoading: rtLoading } = useQuery<RoomTypeType[]>(
    ["fetchHotelRoomTypes", selectedHotelId],
    () =>
      apiClient.fetchHotelRoomTypes(selectedHotelId).then((r) => r as any),
    { enabled: !!selectedHotelId },
  );

  // Fetch rooms for expanded room type
  const { data: rooms, isLoading: roomsLoading } = useQuery<RoomModelType[]>(
    ["fetchHotelRooms", selectedHotelId, expandedRoomTypeId],
    () =>
      apiClient
        .fetchHotelRooms(selectedHotelId, expandedRoomTypeId!)
        .then((r) => r as any),
    { enabled: !!selectedHotelId && !!expandedRoomTypeId },
  );

  // Create room type mutation
  const { mutate: createRoomType, isLoading: creatingRT } = useMutation(
    () =>
      apiClient.createRoomType(selectedHotelId, {
        name: rtForm.name,
        code: rtForm.code.toUpperCase(),
        description: rtForm.description,
        basePrice: Number(rtForm.basePrice),
        maxAdults: Number(rtForm.maxAdults),
        maxChildren: Number(rtForm.maxChildren),
        bedConfiguration: rtForm.bedConfiguration,
        amenities: rtForm.amenities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        imageUrls: [],
      } as any),
    {
      onSuccess: () => {
        showToast({
          title: "Room Type Created",
          description: "Room type added successfully.",
          type: "SUCCESS",
        });
        queryClient.invalidateQueries(["fetchHotelRoomTypes", selectedHotelId]);
        setShowRTForm(false);
        setRtForm({
          name: "",
          code: "",
          description: "",
          basePrice: "",
          maxAdults: "2",
          maxChildren: "1",
          bedConfiguration: "",
          amenities: "",
        });
      },
      onError: () => {
        showToast({
          title: "Error",
          description: "Failed to create room type.",
          type: "ERROR",
        });
      },
    },
  );

  // Create room mutation
  const { mutate: createRoom, isLoading: creatingRoom } = useMutation(
    (roomTypeId: string) =>
      apiClient.createHotelRoom(selectedHotelId, {
        roomTypeId,
        roomNumber: roomForm.roomNumber,
        floor: Number(roomForm.floor),
      } as any),
    {
      onSuccess: (_, roomTypeId) => {
        showToast({
          title: "Room Created",
          description: `Room ${roomForm.roomNumber} added successfully.`,
          type: "SUCCESS",
        });
        queryClient.invalidateQueries([
          "fetchHotelRooms",
          selectedHotelId,
          roomTypeId,
        ]);
        setShowRoomForm(null);
        setRoomForm({ roomNumber: "", floor: "1" });
      },
      onError: () => {
        showToast({
          title: "Error",
          description: "Failed to create room.",
          type: "ERROR",
        });
      },
    },
  );

  // Update room status mutation
  const { mutate: updateRoomStatus } = useMutation(
    ({
      roomId,
      status,
    }: {
      roomId: string;
      status: RoomStatusType;
    }) => apiClient.updateRoomStatus(selectedHotelId, roomId, status),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([
          "fetchHotelRooms",
          selectedHotelId,
          expandedRoomTypeId,
        ]);
        showToast({
          title: "Room Updated",
          description: "Room status updated.",
          type: "SUCCESS",
        });
      },
    },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Room Management
        </h1>
        <p className="text-slate-500 mt-1">
          Manage room types and individual rooms for each hotel.
        </p>
      </div>

      {/* Hotel Selector */}
      <Card className="shadow-sm border-0 bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Hotel className="h-5 w-5 text-primary-600 shrink-0" />
            <div className="flex-1">
              <Label className="text-sm font-medium text-slate-700 mb-1 block">
                Select Hotel
              </Label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedHotelId}
                onChange={(e) => {
                  setSelectedHotelId(e.target.value);
                  setExpandedRoomTypeId(null);
                }}
              >
                <option value="">— Choose a hotel —</option>
                {(Array.isArray(hotels) ? hotels : (hotels as any)?.data ?? []).map(
                  (h: HotelType) => (
                    <option key={h._id} value={h._id}>
                      {h.name} · {h.city}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedHotelId && (
        <>
          {/* Room Types */}
          <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Room Types</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowRTForm((p) => !p)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Room Type
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create Room Type Form */}
              {showRTForm && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">
                    New Room Type
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-600 mb-1 block">
                        Name *
                      </Label>
                      <Input
                        placeholder="e.g. Deluxe Double"
                        value={rtForm.name}
                        onChange={(e) =>
                          setRtForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 mb-1 block">
                        Code *
                      </Label>
                      <Input
                        placeholder="e.g. DLX"
                        value={rtForm.code}
                        onChange={(e) =>
                          setRtForm((f) => ({
                            ...f,
                            code: e.target.value.toUpperCase(),
                          }))
                        }
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 mb-1 block">
                        Base Price / Night (£) *
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="120"
                        value={rtForm.basePrice}
                        onChange={(e) =>
                          setRtForm((f) => ({
                            ...f,
                            basePrice: e.target.value,
                          }))
                        }
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 mb-1 block">
                        Bed Configuration
                      </Label>
                      <Input
                        placeholder="e.g. 1 King Bed"
                        value={rtForm.bedConfiguration}
                        onChange={(e) =>
                          setRtForm((f) => ({
                            ...f,
                            bedConfiguration: e.target.value,
                          }))
                        }
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 mb-1 block">
                        Max Adults
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={rtForm.maxAdults}
                        onChange={(e) =>
                          setRtForm((f) => ({
                            ...f,
                            maxAdults: e.target.value,
                          }))
                        }
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 mb-1 block">
                        Max Children
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={rtForm.maxChildren}
                        onChange={(e) =>
                          setRtForm((f) => ({
                            ...f,
                            maxChildren: e.target.value,
                          }))
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">
                      Description
                    </Label>
                    <Input
                      placeholder="Brief description"
                      value={rtForm.description}
                      onChange={(e) =>
                        setRtForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">
                      Amenities (comma-separated)
                    </Label>
                    <Input
                      placeholder="WiFi, TV, Mini-bar"
                      value={rtForm.amenities}
                      onChange={(e) =>
                        setRtForm((f) => ({
                          ...f,
                          amenities: e.target.value,
                        }))
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRTForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => createRoomType()}
                      disabled={
                        creatingRT || !rtForm.name || !rtForm.code || !rtForm.basePrice
                      }
                    >
                      {creatingRT && (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      )}
                      Create Room Type
                    </Button>
                  </div>
                </div>
              )}

              {/* Room Types List */}
              {rtLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              ) : !roomTypes || roomTypes.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">
                  No room types yet. Add one above.
                </p>
              ) : (
                <div className="space-y-3">
                  {roomTypes.map((rt) => (
                    <div
                      key={rt._id}
                      className="border border-slate-200 rounded-xl overflow-hidden"
                    >
                      {/* Room Type Header */}
                      <div
                        className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() =>
                          setExpandedRoomTypeId(
                            expandedRoomTypeId === rt._id ? null : rt._id,
                          )
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {rt.code}
                          </Badge>
                          <div>
                            <span className="font-medium text-slate-800">
                              {rt.name}
                            </span>
                            <span className="text-sm text-slate-500 ml-2">
                              £{rt.basePrice}/night · {rt.maxAdults}A{" "}
                              {rt.maxChildren}C
                            </span>
                            {rt.bedConfiguration && (
                              <span className="text-xs text-slate-400 ml-2">
                                · {rt.bedConfiguration}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 transition-transform ${
                            expandedRoomTypeId === rt._id ? "rotate-180" : ""
                          }`}
                        />
                      </div>

                      {/* Rooms under this type */}
                      {expandedRoomTypeId === rt._id && (
                        <div className="p-4 border-t border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">
                              Rooms
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setShowRoomForm(
                                  showRoomForm === rt._id ? null : rt._id,
                                )
                              }
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Room
                            </Button>
                          </div>

                          {/* Add Room Form */}
                          {showRoomForm === rt._id && (
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs text-slate-600 mb-1 block">
                                    Room Number *
                                  </Label>
                                  <Input
                                    placeholder="101"
                                    value={roomForm.roomNumber}
                                    onChange={(e) =>
                                      setRoomForm((f) => ({
                                        ...f,
                                        roomNumber: e.target.value,
                                      }))
                                    }
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600 mb-1 block">
                                    Floor
                                  </Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={roomForm.floor}
                                    onChange={(e) =>
                                      setRoomForm((f) => ({
                                        ...f,
                                        floor: e.target.value,
                                      }))
                                    }
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowRoomForm(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => createRoom(rt._id)}
                                  disabled={
                                    creatingRoom || !roomForm.roomNumber
                                  }
                                >
                                  {creatingRoom && (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  )}
                                  Add Room
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Rooms List */}
                          {roomsLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                            </div>
                          ) : !rooms || rooms.length === 0 ? (
                            <p className="text-slate-400 text-xs text-center py-4">
                              No rooms yet. Add one above.
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {rooms.map((room) => (
                                <div
                                  key={room._id}
                                  className="border border-slate-200 rounded-xl p-3 bg-white"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-slate-800 text-sm">
                                      #{room.roomNumber}
                                    </span>
                                    <Badge
                                      className={`text-xs flex items-center gap-1 ${
                                        statusStyles[room.status]
                                      }`}
                                    >
                                      {statusIcons[room.status]}
                                      {room.status}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-400 mb-2">
                                    Floor {room.floor}
                                  </p>
                                  <select
                                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    value={room.status}
                                    onChange={(e) =>
                                      updateRoomStatus({
                                        roomId: room._id,
                                        status: e.target.value as RoomStatusType,
                                      })
                                    }
                                  >
                                    <option value="available">Available</option>
                                    <option value="occupied">Occupied</option>
                                    <option value="maintenance">
                                      Maintenance
                                    </option>
                                    <option value="cleaning">Cleaning</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminRooms;

