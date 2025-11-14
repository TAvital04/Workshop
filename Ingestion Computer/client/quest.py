from questdb.ingress import Sender
from datetime import datetime
import sine

# Configure the address of the QuestDB instance
conf = 'http::addr=localhost:9000;'
table_name = 'sin-table'

with Sender.from_conf(conf) as sender:
    # Constantly send data to QuestDB
    while True:
        # Prepare the data
        y = sine.getY()

        # Configure a message to be sent to QuestDB, including...
        sender.row(
            #... the name of the table that the data will be sent to
            table_name,
            
            #... the columns of the row the message will be in
            columns = {
                'yValues': y
            },
            
            #... the time stamp of the message
            at = datetime.now()
        )

        print(y)

        # Send the message
        sender.flush()
        
