import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) {
    return null; // Don't show pagination if only one page
  }

  const handleFirstPage = () => onPageChange(1);
  const handlePrevPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };
  const handleLastPage = () => onPageChange(totalPages);

  // Generate a sliding window of page numbers limited to maxPagesToShow (e.g., only 3 buttons)
  // This version centers the current page when possible. If near the edges it clamps.
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 3; // show only 3 numeric buttons

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    const half = Math.floor(maxPagesToShow / 2);
    let start = currentPage - half;
    // clamp start to valid range
    if (start < 1) start = 1;
    if (start > totalPages - maxPagesToShow + 1) start = totalPages - maxPagesToShow + 1;
    const end = start + maxPagesToShow - 1;

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col gap-4 items-center">
      {/* Info text: showing X of Y */}
      <p className="text-sm font-medium text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{startItem}</span> to{" "}
        <span className="font-semibold text-foreground">{endItem}</span> of{" "}
        <span className="font-semibold text-foreground">{totalItems}</span> items
      </p>

      {/* Pagination controls */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {/* First page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFirstPage}
          disabled={currentPage === 1 || disabled}
          className="h-9 w-9 p-0 border-2 hover:bg-accent-50 hover:border-accent-300 transition-all"
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevPage}
          disabled={currentPage === 1 || disabled}
          className="h-9 w-9 p-0 border-2 hover:bg-accent-50 hover:border-accent-300 transition-all"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page number buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page) => {
            const isCurrentPage = page === currentPage;
            return (
              <Button
                key={page}
                variant={isCurrentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                disabled={disabled}
                className={`h-9 w-9 p-0 font-semibold transition-all border-2 ${
                  isCurrentPage
                    ? "bg-gradient-to-r from-primary to-accent text-white border-transparent shadow-md hover:shadow-lg"
                    : "hover:bg-accent-50 hover:border-accent-300"
                }`}
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={currentPage === totalPages || disabled}
          className="h-9 w-9 p-0 border-2 hover:bg-accent-50 hover:border-accent-300 transition-all"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLastPage}
          disabled={currentPage === totalPages || disabled}
          className="h-9 w-9 p-0 border-2 hover:bg-accent-50 hover:border-accent-300 transition-all"
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Page info: current page / total pages */}
      <p className="text-xs text-muted-foreground font-medium">
        Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>
      </p>
    </div>
  );
}
