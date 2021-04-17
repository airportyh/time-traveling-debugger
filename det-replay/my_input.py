import os
import atexit
import pickle

response_idx = 0
responses = []

def save_responses():
    with open("responses.pickle", "wb") as file:
        pickle.dump(responses, file)

if os.environ.get('RECORD') == 'True':
    atexit.register(save_responses)
elif os.environ.get('REPLAY') == 'True':
    with open("responses.pickle", "rb") as file:
        responses = pickle.load(file)
else:
    raise Exception("Must pass in RECORD=True or REPLAY=True as environment variable")

def my_input(prompt):
    global response_idx

    if os.environ.get('RECORD') == 'True':
        answer = input(prompt)
        responses.append(answer)
        return answer
    elif os.environ.get('REPLAY') == 'True':
        resp = responses[response_idx]
        response_idx += 1
        return resp
    else:
        raise Exception("Must pass in RECORD=True or REPLAY=True as environment variable")
        