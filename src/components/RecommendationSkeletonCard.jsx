import React from "react";

const RecommendationSkeletonCard = () => {
  return (
    <div className="media-card recommendation-item-card is-loading">
      <div className="media-poster skeleton"></div>
      <div className="media-info">
        <div className="skeleton skeleton-text skeleton-title"></div>
        <div className="skeleton skeleton-text skeleton-meta"></div>
      </div>
    </div>
  );
};

export default RecommendationSkeletonCard;
