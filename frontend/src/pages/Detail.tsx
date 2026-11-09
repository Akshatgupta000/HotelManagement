import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useQueryWithLoading } from "../hooks/useLoadingHooks";
import * as apiClient from "./../api-client";
import { AiFillStar } from "react-icons/ai";
import GuestInfoForm from "../forms/GuestInfoForm/GuestInfoForm";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { SafeImage } from "../components/ui/safe-image";
import type { ReviewType, RoomTypeType } from "../../../shared/types";
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  Car,
  Wifi,
  Waves,
  Dumbbell,
  Sparkles,
  Plane,
  Building2,
  BedDouble,
  Check,
  Users as UsersIcon,
} from "lucide-react";

const Detail = () => {
  const { hotelId } = useParams();
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(
    null,
  );

  const { data: hotel, isLoading: isHotelLoading } = useQueryWithLoading(
    "fetchHotelById",
    () => apiClient.fetchHotelById(hotelId || ""),
    {
      enabled: !!hotelId,
      loadingMessage: "Loading hotel details...",
    },
  );

  const { data: roomTypes } = useQuery<RoomTypeType[]>(
    ["fetchHotelRoomTypes", hotelId],
    () =>
      apiClient.fetchHotelRoomTypes(hotelId || "").then((r) => r as any),
    { enabled: !!hotelId },
  );

  const selectedRoomType = roomTypes?.find((r) => r._id === selectedRoomTypeId);
  const activePrice = selectedRoomType
    ? selectedRoomType.basePrice
    : hotel?.pricePerNight || 0;

  const { data: reviews, isLoading: isReviewsLoading } = useQueryWithLoading<
    ReviewType[]
  >(
    ["fetchHotelReviews", hotelId],
    () => apiClient.fetchHotelReviews(hotelId || ""),
    {
      enabled: !!hotelId,
    },
  );

  if (isHotelLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-2/3 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[300px] bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="text-center text-lg text-gray-500 py-8">
        No hotel found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="flex">
          {Array.from({ length: hotel.starRating }).map((_, i) => (
            <AiFillStar key={i} className="fill-yellow-400" />
          ))}
        </span>
        <h1 className="text-sm md:text-lg font-medium">{hotel.name}</h1>

        {/* Location and Contact Info */}
        <div className="flex items-center gap-4 mt-2 text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>
              {hotel.city}, {hotel.country}
            </span>
          </div>
          {hotel.contact?.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{hotel.contact.phone}</span>
            </div>
          )}
          {hotel.contact?.website && (
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <a
                href={hotel.contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Website
              </a>
            </div>
          )}
        </div>

        {/* Hotel Stats */}
        {((hotel.totalBookings && hotel.totalBookings > 0) ||
          (hotel.totalRevenue && hotel.totalRevenue > 0) ||
          hotel.isFeatured) && (
          <div className="flex gap-4 mt-4">
            {hotel.totalBookings && hotel.totalBookings > 0 && (
              <Badge variant="outline">{hotel.totalBookings} bookings</Badge>
            )}
            {hotel.totalRevenue && hotel.totalRevenue > 0 && (
              <Badge variant="outline">
                £{hotel.totalRevenue.toLocaleString()} revenue
              </Badge>
            )}
            {/* Rating Badge */}
            <Badge variant="outline" className="text-gray-600">
              {hotel.averageRating && hotel.averageRating > 0
                ? `${hotel.averageRating.toFixed(1)} avg rating${
                    hotel.reviewCount ? ` (${hotel.reviewCount})` : ""
                  }`
                : "No guest reviews yet"}
            </Badge>
            {hotel.isFeatured && (
              <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>
            )}
          </div>
        )}

        {/* Hotel Types */}
        {hotel.type && hotel.type.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {hotel.type.map((type, index) => (
              <Badge
                key={index}
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                {type}
              </Badge>
            ))}
          </div>
        )}

        {/* Hotel Images */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {hotel.imageUrls.map((image: string, i: number) => (
            <div key={i} className="h-[300px] relative">
              <SafeImage
                src={image}
                alt={hotel.name}
                fill
                className="rounded-xl object-cover object-center"
              />
            </div>
          ))}
        </div>

        {/* Price and Guest Info */}
        <div className="flex items-center justify-between mt-4 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-sm md:text-lg font-medium text-gray-700">
                £{hotel.pricePerNight}
              </p>
              <p className="text-sm text-gray-600">per night</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700">
                  {hotel.adultCount}
                </p>
                <p className="text-sm text-gray-600">Adults</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700">
                  {hotel.childCount}
                </p>
                <p className="text-sm text-gray-600">Children</p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700">
              {hotel.starRating}
            </p>
            <p className="text-sm text-gray-600">Star Rating</p>
          </div>
        </div>

        {/* Hotel Description */}
        {hotel.description && (
          <div className="mt-6">
            <h3 className="text-xl font-medium mb-3">About This Hotel</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {hotel.description}
            </p>
          </div>
        )}
      </div>

      {/* Contact Information */}
      {hotel.contact && (
        <div className="border border-slate-300 rounded-xl p-4">
          <h3 className="text-xl font-medium mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hotel.contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-600" />
                <span>
                  <span className="font-medium text-gray-700">Phone:</span>{" "}
                  {hotel.contact.phone}
                </span>
              </div>
            )}
            {hotel.contact.email && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <span>
                  <span className="font-medium text-gray-700">Email:</span>{" "}
                  {hotel.contact.email}
                </span>
              </div>
            )}
            {hotel.contact.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <span>
                  <span className="font-medium text-gray-700">Website:</span>{" "}
                  <a
                    href={hotel.contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    www.arnobmahmud.com
                  </a>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hotel Policies */}
      {hotel.policies && (
        <div className="border border-slate-300 rounded-xl p-4">
          <h3 className="text-xl font-medium mb-3">Hotel Policies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hotel.policies.checkInTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span>
                  <span className="font-medium text-gray-700">Check-in:</span>{" "}
                  {hotel.policies.checkInTime}
                </span>
              </div>
            )}
            {hotel.policies.checkOutTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span>
                  <span className="font-medium text-gray-700">Check-out:</span>{" "}
                  {hotel.policies.checkOutTime}
                </span>
              </div>
            )}
            {hotel.policies.cancellationPolicy && (
              <div>
                <span className="font-medium text-gray-700">Cancellation:</span>{" "}
                {hotel.policies.cancellationPolicy}
              </div>
            )}
            {hotel.policies.petPolicy && (
              <div>
                <span className="font-medium text-gray-700">Pet Policy:</span>{" "}
                {hotel.policies.petPolicy}
              </div>
            )}
            {hotel.policies.smokingPolicy && (
              <div>
                <span className="font-medium text-gray-700">Smoking:</span>{" "}
                {hotel.policies.smokingPolicy}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Facilities */}
      <div className="border border-slate-300 rounded-xl p-4">
        <h3 className="text-xl font-medium mb-3">Facilities</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {hotel.facilities.map((facility) => (
            <div key={facility} className="flex items-center gap-2">
              <div className="w-4 h-4 text-green-600">
                {facility === "Free WiFi" && <Wifi className="w-4 h-4" />}
                {facility === "Parking" && <Car className="w-4 h-4" />}
                {facility === "Airport Shuttle" && (
                  <Plane className="w-4 h-4" />
                )}
                {facility === "Outdoor Pool" && <Waves className="w-4 h-4" />}
                {facility === "Spa" && <Sparkles className="w-4 h-4" />}
                {facility === "Fitness Center" && (
                  <Dumbbell className="w-4 h-4" />
                )}
                {facility === "Family Rooms" && (
                  <Building2 className="w-4 h-4" />
                )}
                {facility === "Non-Smoking Rooms" && (
                  <Building2 className="w-4 h-4" />
                )}
                {![
                  "Free WiFi",
                  "Parking",
                  "Airport Shuttle",
                  "Outdoor Pool",
                  "Spa",
                  "Fitness Center",
                  "Family Rooms",
                  "Non-Smoking Rooms",
                ].includes(facility) && <Building2 className="w-4 h-4" />}
              </div>
              <span>{facility}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Guest Reviews */}
      <div className="border border-slate-300 rounded-xl p-4">
        <h3 className="text-xl font-medium mb-3">Guest Reviews</h3>
        {isReviewsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No reviews yet. Guests can leave a review from My Bookings after
            their stay.
          </p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <li
                key={review._id}
                className="border-b border-gray-100 pb-3 last:border-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-700">
                    {review.rating.toFixed(1)}★
                  </span>
                  {review.isVerified && (
                    <Badge variant="outline" className="text-xs">
                      Verified stay
                    </Badge>
                  )}
                  {review.createdAt && (
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-line">
                  {review.comment}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Room Types Section */}
      {roomTypes && roomTypes.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
          <div>
            <h3 className="text-xl font-medium text-slate-800">
              Select Your Room Type
            </h3>
            <p className="text-sm text-slate-500">
              Choose from our available room options for this hotel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomTypes.map((rt) => {
              const isSelected = selectedRoomTypeId === rt._id;
              return (
                <div
                  key={rt._id}
                  onClick={() =>
                    setSelectedRoomTypeId(isSelected ? null : rt._id)
                  }
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {rt.name}
                        </span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {rt.code}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {rt.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-lg font-bold text-blue-600">
                        £{rt.basePrice}
                      </span>
                      <span className="text-xs text-slate-400 block">
                        /night
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600">
                    {rt.bedConfiguration && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-3.5 w-3.5 text-slate-500" />
                        {rt.bedConfiguration}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <UsersIcon className="h-3.5 w-3.5 text-slate-500" />
                      {rt.maxAdults} Adults, {rt.maxChildren} Children
                    </span>
                  </div>

                  {rt.amenities && rt.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {rt.amenities.map((a, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          {a}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      {isSelected ? "Selected" : "Click to select"}
                    </span>
                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className="h-7 text-xs"
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-3 w-3 mr-1" /> Selected
                        </>
                      ) : (
                        "Choose Room"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr]">
        <div className="h-fit">
          <GuestInfoForm
            pricePerNight={activePrice}
            hotelId={hotel._id}
            selectedRoomTypeId={selectedRoomTypeId || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default Detail;
