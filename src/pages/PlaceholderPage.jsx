function PlaceholderPage({ title, description }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-page-icon">
        <i className="fa-solid fa-layer-group" />
      </div>

      <span className="page-eyebrow">BO‘LIM</span>

      <h2>{title}</h2>

      <p>
        {description ||
          "Ushbu bo‘limning ichki funksiyalari keyingi bosqichda tayyorlanadi."}
      </p>
    </div>
  );
}

export default PlaceholderPage;