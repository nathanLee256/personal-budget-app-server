import sys
import pandas as pd
import json

# Define the python function which receives the .csv file, performs pre-processing, and returns a python dictionary of monthly expenses
def data_prep(path):
    # Load the file into a df
    df = pd.read_csv(path, na_filter=False)

    # Rename the columns
    df.columns = ['Date', 'Amount', 'Name', 'Balance', 'Category']
    
    # Add a new column 'Transaction Type'
    df['Transaction Type'] = ''

    # Convert the 'Date' column to datetime
    df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%Y')

    # Populate the 'Transaction Type' column
    df['Transaction Type'] = None

    def categorize_transaction(row):
        if row['Amount'] > 0:
            return 'Credit'
        elif row['Amount'] < 0:
            return 'Debit'
        elif row['Category'] == 'Transfer' or row['Category'] == 'Null':
            return 'Null'
        return None

    df['Transaction Type'] = df.apply(categorize_transaction, axis=1)

    # Remove rows where 'Category' is 'Transfer'
    df = df[df['Category'] != 'Transfer']

    # Group by 'Category' and calculate the sum of 'Amount' for each group
    cat_sums = df.groupby('Category')['Amount'].sum()

    # Convert the result to a DataFrame for better readability (optional)
    cat_sums_df = cat_sums.reset_index()

    # Remove rows where 'Category' is 'Null'
    cat_sums_df = cat_sums_df[cat_sums_df['Category'] != 'Null']

    # Remove rows where 'Amount' is zero
    cat_sums_df = cat_sums_df[cat_sums_df['Amount'] != 0]

    # Convert 'Amount' column values to doubles
    cat_sums_df['Amount'] = cat_sums_df['Amount'].astype(float).round(2)

    # Create python dictionary which will store the return data
    return_dict = {'Income': {}, 'Expenditure': {}}

    for index, row in cat_sums_df.iterrows():
        if row['Amount'] > 0:
            return_dict['Income'][row['Category']] = row['Amount']
        elif row['Amount'] < 0:
            return_dict['Expenditure'][row['Category']] = row['Amount']

    return return_dict

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("No file path provided")
        sys.exit(1)

    file_path = sys.argv[1]

    try:
        cleaned_data = data_prep(file_path)
        print(json.dumps(cleaned_data))  # Only print the final JSON output
    except Exception as e:
        error_response = {"error": str(e)}
        print(json.dumps(error_response))  # Print errors as JSON
        sys.exit(1)
