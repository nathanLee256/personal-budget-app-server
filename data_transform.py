import pandas as pd
import sys
import json

# python function to transform data

def data_transform (json_string):
    #function step 1: convert JSON string to a python dictionary
    python_dict = json.loads(json_string)

    # function step 2: Convert dictionary to DataFrame
    df = pd.DataFrame(python_dict)

    # function step 3: Reset index to create a 'Category' column
    df = df.reset_index().rename(columns={"index": "Transaction Cat"})

    # function step 4: convert the expenditure column to its absolute value
    df['Expenditure'] = df['Expenditure'].apply(lambda x: abs(x))

    #function step 5:
    #iterate over the Income column and convert all Nan values to -1
    df['Income'] = df['Income'].fillna(-1)
    #Function step 6: do the same for Expenditure
    df['Expenditure'] = df['Expenditure'].fillna(-1)

    #function step 7: iterate over the df and assign values to a new column 'Amount'
    zero = 0
    df['Amount'] = 0
    
    for index, row in df.iterrows():
        if row['Income'] is not None and row['Income'] > zero:
            df.at[index, 'Amount'] = row['Income']
        if row['Expenditure'] is not None and row['Expenditure'] > zero:
            df.at[index, 'Amount'] = row['Expenditure']

    # function step 8: create a Transaction Type binary column
    df['Transaction Type'] = 0

    #function step 9: assign binary values to the 'Transaction Type' column
    for index, row in df.iterrows():
        if row['Income'] is not None and row['Income'] > zero:
            df.at[index, 'Transaction Type'] = 'Income'
        if row['Expenditure'] is not None and row['Expenditure'] > zero:
            df.at[index, 'Transaction Type'] = 'Expenditure'

    #function step 10: drop the Income and Expenditure columns
    df = df.drop(columns=['Income', 'Expenditure'])

    # function step 11: Convert the DataFrame to a dictionary
    result_dict = df.to_dict(orient="records")

    #function step 12: convert the python dict to JSON
    data = json.dumps(result_dict)
    
    return data

if __name__ == "__main__":
    try:
        # Read JSON string from stdin
        input_json = sys.stdin.read()

        # Transform the data
        transformed_data = data_transform(input_json)

        # Print the transformed data to stdout
        print(transformed_data)
    except Exception as e:
        # Print error message as JSON to stdout
        error_response = {"error": str(e)}
        print(json.dumps(error_response))
        sys.exit(1)