import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  Inbox,
  X,
} from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounce";

interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
}

interface DataTableProps {
  title?: string;
  columns: Column[];
  data: any[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  exportable?: boolean;
  refreshable?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
  onSearch?: (query: string) => void;
  onSort?: (column: string, direction: "asc" | "desc") => void;
  onFilter?: (filters: Record<string, any>) => void;
  onRowClick?: (row: any) => void;
  onRowAction?: (action: string, row: any) => void;
  onBulkAction?: (action: string, rows: any[]) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  className?: string;
  emptyState?: React.ReactNode;
  searchPlaceholder?: string;
  getRowId?: (row: any, index: number) => string;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    action: string;
    variant?: "default" | "destructive";
  }>;
}

export default function DataTable({
  title,
  columns,
  data,
  loading = false,
  searchable = true,
  filterable = true,
  selectable = false,
  exportable = false,
  refreshable = false,
  pagination,
  onSearch,
  onSort,
  onFilter,
  onRowClick,
  onRowAction,
  onBulkAction,
  onRefresh,
  onExport,
  className,
  emptyState,
  searchPlaceholder = "Search by name, title, category, status...",
  getRowId,
  actions = [],
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [sortConfig, setSortConfig] = useState<{
    column: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const showActionsColumn = Boolean(onRowAction || actions.length > 0);
  const tableColumnCount = columns.length + (selectable ? 1 : 0) + (showActionsColumn ? 1 : 0);

  useEffect(() => {
    onSearch?.(debouncedSearchQuery.trim());
  }, [debouncedSearchQuery, onSearch]);

  useEffect(() => {
    setSelectedRows(new Set());
  }, [data]);

  const rowId = (row: any, index: number) =>
    getRowId?.(row, index) ?? String(row?.id ?? row?._id ?? index);

  const handleSort = (column: string) => {
    const direction =
      sortConfig?.column === column && sortConfig.direction === "asc"
        ? "desc"
        : "asc";
    
    setSortConfig({ column, direction });
    onSort?.(column, direction);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map((row, index) => rowId(row, index))));
    }
  };

  const handleSelectRow = (index: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleBulkAction = (action: string) => {
    const selectedData = data.filter((row, index) => selectedRows.has(rowId(row, index)));
    onBulkAction?.(action, selectedData);
    setSelectedRows(new Set());
  };

  const renderCell = (column: Column, row: any, index: number) => {
    const value = row[column.key];
    
    if (column.render) {
      return column.render(value, row);
    }

    // Default rendering based on value type
    if (typeof value === "boolean") {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      );
    }

    if (typeof value === "number") {
      return value.toLocaleString();
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    return value || "-";
  };

  const LoadingSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-border/60">
          {selectable && (
            <td className="px-4 py-3">
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            </td>
          )}
          {columns.map((col, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-muted rounded animate-pulse" />
            </td>
          ))}
          {showActionsColumn && (
            <td className="px-4 py-3">
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            </td>
          )}
        </tr>
      ))}
    </>
  );

  const EmptyState = () => (
    <tr>
      <td colSpan={tableColumnCount} className="px-4 py-12">
        {emptyState || (
          <div className="text-center text-muted-foreground">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">No data found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search terms" : "No records to display"}
            </p>
          </div>
        )}
      </td>
    </tr>
  );

  return (
    <Card className={className} data-testid="data-table">
      {title && (
        <CardHeader>
          <CardTitle data-testid="table-title">{title}</CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        {/* Table Controls */}
        <div className="flex flex-col gap-3 p-4 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {searchable && (
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-9 w-full sm:w-80"
                  data-testid="table-search"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
            
            {filterable && onFilter && (
              <Button variant="outline" size="sm" data-testid="table-filter">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            )}
            
            {selectedRows.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="bulk-actions">
                    Actions ({selectedRows.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleBulkAction("delete")}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center justify-end space-x-2">
            {refreshable && onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                data-testid="refresh-table"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            
            {exportable && onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                data-testid="export-table"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40 border-b border-border/60">
              <tr>
                {selectable && (
                  <th className="px-4 py-3 text-left">
                    <Checkbox
                      checked={selectedRows.size === data.length && data.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="select-all"
                    />
                  </th>
                )}
                
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                      column.sortable ? "cursor-pointer hover:bg-muted/50" : ""
                    }`}
                    style={{ width: column.width }}
                    onClick={column.sortable ? () => handleSort(column.key) : undefined}
                    data-testid={`header-${column.key}`}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {column.sortable && (
                        <div className="flex flex-col">
                          <SortAsc
                            className={`h-3 w-3 ${
                              sortConfig?.column === column.key &&
                              sortConfig.direction === "asc"
                                ? "text-primary"
                                : "text-muted-foreground/70"
                            }`}
                          />
                          <SortDesc
                            className={`h-3 w-3 ${
                              sortConfig?.column === column.key &&
                              sortConfig.direction === "desc"
                                ? "text-primary"
                                : "text-muted-foreground/70"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                
                {showActionsColumn && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            
            <tbody className="bg-card divide-y divide-border/60">
              {loading ? (
                <LoadingSkeleton />
              ) : data.length === 0 ? (
                <EmptyState />
              ) : (
                data.map((row, index) => {
                  const id = rowId(row, index);
                  return (
                  <tr
                    key={id}
                    className={`hover:bg-muted/40 ${
                      onRowClick ? "cursor-pointer" : ""
                    } ${selectedRows.has(id) ? "bg-primary/10" : ""}`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    data-testid={`table-row-${index}`}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedRows.has(id)}
                          onCheckedChange={() => handleSelectRow(id)}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`select-row-${index}`}
                        />
                      </td>
                    )}
                    
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="px-4 py-3 text-sm text-foreground"
                        data-testid={`cell-${column.key}-${index}`}
                      >
                        {renderCell(column, row, index)}
                      </td>
                    ))}
                    
                    {showActionsColumn && (
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`row-actions-${index}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions.length > 0 ? (
                              actions.map((action) => (
                                <DropdownMenuItem
                                  key={action.action}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRowAction?.(action.action, row);
                                  }}
                                  className={action.variant === "destructive" ? "text-destructive" : undefined}
                                >
                                  {action.icon && <span className="mr-2">{action.icon}</span>}
                                  {action.label}
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRowAction?.("view", row);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRowAction?.("edit", row);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRowAction?.("delete", row);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex flex-col gap-3 px-4 py-3 border-t border-border/60 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-sm text-muted-foreground">
                Showing {pagination.total === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} results
              </span>
              
              <Select
                value={pagination.limit.toString()}
                onValueChange={(value) => pagination.onLimitChange(parseInt(value))}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                data-testid="prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm text-foreground/80 whitespace-nowrap">
                Page {pagination.page} of {Math.max(1, Math.ceil(pagination.total / pagination.limit))}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.max(1, Math.ceil(pagination.total / pagination.limit))}
                data-testid="next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

