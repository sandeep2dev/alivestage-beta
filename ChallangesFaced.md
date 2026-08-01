#Challanges Faced

1. I wanted it to be escrow style booking platform where both artist and fan are in a contract as alivestage hold the money before the performance
The easiest way to this was razorpay route, other ways are possible but RBI is strict about that and need a lot of documents and complience and legal so chose Razorpay route

2. Having chosen razorpay route the problem was that with a current account and domestic turnover exceeding ₹40 lakhs
for this I had to change the user flow -> Now user had to pay 10%(pure comission of alivestage) of the total amount upfront after the confirmation from artist via whatsapp. And rest of money artist has to personally connect before performance or after whatever it's upto them.

3. Whatsapp do not let unregistered business to verify whatsapp number with otp using the auth template
- thinkinh of just taking the number input wiuthout confirmation