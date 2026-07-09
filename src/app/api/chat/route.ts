import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { messages, botId } = await req.json()
    const lastMessage = messages[messages.length - 1].content.toLowerCase()
    
    let reply = "I'm a workflow bot. I can help with that!"
    
    // Simulate a Food Ordering / Hotel Reservation Bot based on keywords
    if (lastMessage.includes('hello') || lastMessage.includes('hi')) {
      reply = "Hello! Welcome to our automated service. Are you looking to make a **Hotel Reservation** or **Order Food**?"
    } 
    // Check conversation history to know what step we are on
    const botMessages = messages.filter((m: any) => m.role === 'bot').map((m: any) => m.content)
    const askedForFood = botMessages.some((msg: string) => msg.includes('Yum!'))
    const askedForAddress = botMessages.some((msg: string) => msg.includes('delivery address'))

    // Hotel Flow
    if (lastMessage.includes('hotel') || lastMessage.includes('room')) {
      reply = "Great! Let's book a room. What city are you traveling to, and for how many nights?"
    }
    else if (lastMessage.includes('night') || lastMessage.includes('days')) {
      reply = "Perfect. I found a Deluxe Suite for $199/night. Shall I confirm this reservation under your name?"
    }
    else if (lastMessage.includes('confirm') || lastMessage.includes('yes')) {
      reply = "✅ **Reservation Confirmed!** Your workflow successfully processed the booking. You will receive an email shortly."
    }
    
    // Food Flow
    else if (!askedForFood && (lastMessage.includes('food') || lastMessage.includes('order'))) {
      reply = "Yum! 🍔 What would you like to order? We have Burgers, Pizza, and Salads today."
    }
    else if (askedForFood && !askedForAddress && (lastMessage.includes('burger') || lastMessage.includes('pizza') || lastMessage.includes('salad'))) {
      reply = "Great choice! That will be $12.50. What is your delivery address?"
    }
    else if (askedForAddress && lastMessage.length > 5) {
      reply = "Got it! Your address is saved. Your order will arrive in 30 minutes. 🚗💨"
    }
    else {
      reply = "I'm processing that through OpenWorkflow... Could you provide a bit more detail? (Try saying 'hotel' or 'order food')"
    }

    // Simulate network delay to make it feel real
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({ reply })
  } catch (error) {
    return NextResponse.json({ reply: 'Sorry, I encountered an error.' }, { status: 500 })
  }
}
