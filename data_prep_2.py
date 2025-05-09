import sys
import pandas as pd
import json

# Define the Python function that receives the .csv file, converts it into a Python dictionary, and returns it
def data_prep_2(path):
    try:
        # Load the CSV file into a Pandas DataFrame without assuming it has headers
        df = pd.read_csv(path, header=None, na_filter=False)  # `header=None` ensures no row is treated as headers

        # Dynamically generate generic column headers: header_1, header_2, etc.
        df.columns = [f"header_{i+1}" for i in range(len(df.columns))]

        # Add a unique ID column (starting from 1)
        df.insert(0, "id", range(1, len(df) + 1))

        # Convert the DataFrame to a dictionary
        # Use 'records' orientation to convert each row into a dictionary
        data_dict = df.to_dict(orient='records')

        # Convert the dictionary into a JSON string
        json_data = json.dumps(data_dict, indent=4)

        return json_data
    except FileNotFoundError:
        return json.dumps({"error": f"File '{path}' not found."})
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    # Check if a file path is provided as a command-line argument
    if len(sys.argv) != 2:
        print("Usage: python script.py <file_path>")
    else:
        file_path = sys.argv[1]
        result = data_prep_2(file_path)
        print(result)

