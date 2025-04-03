import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBackward, faForward } from "@fortawesome/free-solid-svg-icons";

function Pagination({ currentPage, onPageChange, totalPages }) {
  const increment = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const decrement = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  return (
    <div className="pagination_container">
      <div
        className="navbtn"
        onClick={decrement}
        style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
      >
        <FontAwesomeIcon icon={faBackward} />
      </div>
      <div className="pgno">{currentPage}</div>
      <div
        className="navbtn"
        onClick={increment}
        style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
      >
        <FontAwesomeIcon icon={faForward} />
      </div>
    </div>
  );
}

export default Pagination;
