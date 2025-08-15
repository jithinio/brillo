import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, paymentReceived } = await request.json()

    if (!invoiceId || paymentReceived === undefined) {
      return NextResponse.json(
        { error: 'Invoice ID and payment amount are required' },
        { status: 400 }
      )
    }

    // Validate payment amount
    if (paymentReceived < 0) {
      return NextResponse.json(
        { error: 'Payment amount cannot be negative' },
        { status: 400 }
      )
    }

    // First, get the invoice to validate the payment doesn't exceed total
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('total_amount, payment_received, balance_due, status')
      .eq('id', invoiceId)
      .single()

    if (fetchError) {
      console.error('Error fetching invoice:', fetchError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    if (paymentReceived > invoice.total_amount) {
      return NextResponse.json(
        { error: 'Payment amount cannot exceed total invoice amount' },
        { status: 400 }
      )
    }

    // Update the payment - the database trigger will handle balance and status updates
    const { data, error } = await supabase
      .from('invoices')
      .update({ 
        payment_received: paymentReceived,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select(`
        *,
        clients (
          id,
          name,
          company,
          email,
          avatar_url
        ),
        projects (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating payment:', error)
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invoice: data,
      message: 'Payment updated successfully'
    })

  } catch (error) {
    console.error('Error in payment update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const invoiceId = url.searchParams.get('invoiceId')

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('id, payment_received, balance_due, total_amount, status')
      .eq('id', invoiceId)
      .single()

    if (error) {
      console.error('Error fetching payment info:', error)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      payment: {
        invoiceId: data.id,
        paymentReceived: data.payment_received || 0,
        balanceDue: data.balance_due || 0,
        totalAmount: data.total_amount,
        status: data.status
      }
    })

  } catch (error) {
    console.error('Error in payment info API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
