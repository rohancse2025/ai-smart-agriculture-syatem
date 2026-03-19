import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState<any>(null);
  const [crop, setCrop] = useState("");

  const getCrop = async () => {
    const res = await fetch(`http://127.0.0.1:8000/predict?temperature=${temperature}&humidity=${humidity}&soil_moisture=${soil}`);
    const data = await res.json();
    setCrop(data.crop);
  };
  <button onClick={getCrop}>Get Crop Recommendation</button>

  useEffect(() => {
    fetch("http://127.0.0.1:8000/sensor-data")
      .then(res => res.json())
      .then(data => {
        setData(data);

        fetch(`http://127.0.0.1:8000/recommend-crop?temperature=${data.temperature}&humidity=${data.humidity}&soil_moisture=${data.soil_moisture}`)
          .then(res => res.json())
          .then(result => setCrop(result.crop));
      });
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Kisancore-AI ✅</h1>

      {!data ? (
        <p>Loading sensor data...</p>
      ) : (
        <>
          <h2>🌡 Temperature: {data.temperature}°C</h2>
          <h2>💧 Humidity: {data.humidity}%</h2>
          <h2>🌱 Soil Moisture: {data.soil_moisture}</h2>
          <h2>🌾 Recommended Crop: {crop}</h2>
          <h2>{crop && `Recommended Crop: ${crop}`}</h2>
          <button onClick={getCrop}>Get Crop Recommendation</button>

        </>
      )}
    </div>
  );
}

export default App;