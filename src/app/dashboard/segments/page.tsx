'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Users,
  Calendar,
  Filter,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Segment {
  id: string;
  name: string;
  rules: string;
  createdAt: string;
  _count?: {
    members: number;
  };
}

export default function SegmentsPage() {
  const { data: session } = useSession();
  const organizationId = (session?.user as any)?.organizationId;

  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [newSegmentName, setNewSegmentName] = useState('');

  useEffect(() => {
    if (organizationId) {
      fetchSegments();
    }
  }, [organizationId]);

  const fetchSegments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/segments');
      const data = await response.json();

      if (data.success) {
        setSegments(data.segments || []);
      } else {
        toast.error('Failed to fetch segments');
      }
    } catch (error) {
      console.error('Error fetching segments:', error);
      toast.error('Failed to fetch segments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSegment = async () => {
    if (!newSegmentName.trim()) {
      toast.error('Segment name is required');
      return;
    }

    try {
      const response = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSegmentName,
          rules: JSON.stringify({ conditions: [] }),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Segment created successfully');
        setShowCreateDialog(false);
        setNewSegmentName('');
        fetchSegments();
      } else {
        toast.error(data.error || 'Failed to create segment');
      }
    } catch (error) {
      console.error('Error creating segment:', error);
      toast.error('Failed to create segment');
    }
  };

  const handleDeleteSegment = async () => {
    if (!selectedSegment) return;

    try {
      const response = await fetch(`/api/segments/${selectedSegment.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Segment deleted successfully');
        setShowDeleteDialog(false);
        setSelectedSegment(null);
        fetchSegments();
      } else {
        toast.error(data.error || 'Failed to delete segment');
      }
    } catch (error) {
      console.error('Error deleting segment:', error);
      toast.error('Failed to delete segment');
    }
  };

  const filteredSegments = segments.filter((segment) =>
    segment.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Segments</h1>
          <p className="text-muted-foreground">
            Create and manage contact segments for targeted campaigns
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Segment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Segments</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search segments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[250px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading segments...</div>
            </div>
          ) : filteredSegments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No segments found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery
                  ? 'No segments match your search'
                  : 'Get started by creating your first segment'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Segment
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSegments.map((segment) => (
                  <TableRow key={segment.id}>
                    <TableCell className="font-medium">{segment.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <Users className="mr-1 h-3 w-3" />
                        {segment._count?.members || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="mr-2 h-3 w-3" />
                        {new Date(segment.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSegment(segment);
                              setShowDeleteDialog(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Segment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Segment</DialogTitle>
            <DialogDescription>
              Create a new segment to organize your contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium">
                Segment Name
              </label>
              <Input
                id="name"
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                placeholder="e.g., Active Customers"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSegment}>Create Segment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Segment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedSegment?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSegment}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
