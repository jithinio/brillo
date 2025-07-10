import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DataTableProps {
  data: Array<{
    id: string
    name: string
    email: string
    amount: number
    status: string
  }>
}

export function DataTable({ data }: DataTableProps) {
  return (
    <Card className="max-w-full">
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
        <CardDescription>You made 265 sales this month.</CardDescription>
      </CardHeader>
      <CardContent className="max-w-full">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[600px] table-auto">
          <TableHeader className="bg-card">
            <TableRow>
              <TableHead style={{ borderTopLeftRadius: 'var(--radius-md)' }}>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead style={{ borderTopRightRadius: 'var(--radius-md)' }}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>${item.amount}</TableCell>
                <TableCell>{item.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
