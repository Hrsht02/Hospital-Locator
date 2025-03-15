import React, { useState, useEffect } from "react";
import "./HospitalList.css";

const HospitalLocator = () => {
  const [query, setQuery] = useState("");
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [searchCompleted, setSearchCompleted] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setUserLocation({ lat, lon });
        fetchHospitals(lat, lon, 10000); // Default search within 10km
      },
      () => setError("Unable to retrieve location. Please enter manually."),
      { enableHighAccuracy: true }
    );
  }, []);

  const fetchHospitals = async (lat, lon, radius = 10000) => {
    setLoading(true);
    setError("");
    setHospitals([]);
    setSearchCompleted(false);

    const overpassQuery = `
      [out:json];
      node["amenity"="hospital"](around:${radius}, ${lat}, ${lon});
      out body;
    `;
    const apiUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      if (!data.elements || data.elements.length === 0) {
        setSearchCompleted(true);
        return;
      }

      const sortedHospitals = data.elements
        .map((hospital) => ({
          name: hospital.tags.name || "Unknown Hospital",
          address: hospital.tags["addr:full"] || hospital.tags["addr:city"] || "Address not available",
          phone: hospital.tags.phone || "",
          website: hospital.tags.website || "",
          lat: hospital.lat,
          lon: hospital.lon,
          distance: calculateDistance(lat, lon, hospital.lat, hospital.lon),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);

      setHospitals(sortedHospitals);
    } catch (err) {
      setError(`Error fetching data: ${err.message}`);
    } finally {
      setLoading(false);
      setSearchCompleted(true);
    }
  };

  const searchByQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setHospitals([]);
    setSearchCompleted(false);

    // Define the bounding box for Delhi
    const delhiBoundingBox = "28.404181,76.838394,28.883030,77.343689";
    const overpassQuery = `
      [out:json];
      node["amenity"="hospital"](${delhiBoundingBox});
      out body;
    `;
    const apiUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      if (!data.elements || data.elements.length === 0) {
        setSearchCompleted(true);
        return;
      }

      const hospitalsData = data.elements
        .map((hospital) => ({
          name: hospital.tags.name || "Unknown Hospital",
          address: hospital.tags["addr:full"] || hospital.tags["addr:city"] || "Address not available",
          phone: hospital.tags.phone || "",
          website: hospital.tags.website || "",
          lat: hospital.lat,
          lon: hospital.lon,
          distance: "N/A",
        }))
        .filter((hospital) => hospital.address.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10);

      setHospitals(hospitalsData);
    } catch (err) {
      setError(`Error fetching data: ${err.message}`);
    } finally {
      setLoading(false);
      setSearchCompleted(true);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const handleSearch = (e) => {
    if (e.type === "click" || e.key === "Enter") {
      if (query.trim()) {
        searchByQuery();
      } else if (userLocation) {
        fetchHospitals(userLocation.lat, userLocation.lon);
      } else {
        setError("Location not available. Please enter manually.");
      }
    }
  };

  return (
    <div className="container">
      <h1>Find Your Hospital... </h1>
      <div className="search-container">
        <input
          type="text"
          placeholder="Search hospitals by city, name, or pincode..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {loading && <p className="loading">Loading...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && searchCompleted && hospitals.length === 0 && <p>No matching hospitals found.</p>}

      <div className="hospital-grid">
        {hospitals.map((hospital, index) => (
          <div key={index} className="hospital-card">
            <h2>{hospital.name}</h2>
            <p><strong>Address:</strong> {hospital.address}</p>
            {hospital.distance !== "N/A" && <p><strong>Distance:</strong> {hospital.distance} km away</p>}
            {hospital.phone && (
              <p>
                <strong>Phone:</strong> 
                <a href={`tel:${hospital.phone}`} className="phone-link"> {hospital.phone}</a>
              </p>
            )}
            {hospital.website ? (
              <p>
                <strong>Website:</strong> 
                <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="website-link">
                  {hospital.website}
                </a>
              </p>
            ) : <p><strong>Website:</strong> Not available</p>}
            <a
              href={`https://www.google.com/maps?q=${hospital.lat},${hospital.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="map-button"
            >
              Show on Map
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HospitalLocator;