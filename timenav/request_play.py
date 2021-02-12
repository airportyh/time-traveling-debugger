from urllib import request
import json

req = request.Request("http://localhost:1337/api/FunCallExpanded?id=1")
response = request.urlopen(req)
result = json.loads(response.read())
print("result1", result)

cookie = response.getheader("Set-Cookie")
cookie = cookie.split(";")[0]
req = request.Request("http://localhost:1337/api/FunCallExpanded?id=1")
req.add_header("Cookie", cookie)

response = request.urlopen(req)
result2 = json.loads(response.read())
print("result2", result2)