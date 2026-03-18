import requests

# Test OPTIONS
headers = {
    "Origin": "https://myfrontend.vercel.app",
    "Access-Control-Request-Method": "POST"
}
response_opts = requests.options('http://127.0.0.1:8889/api/auth/register', headers=headers)
print("OPTIONS Status:", response_opts.status_code)
print("OPTIONS Headers:", response_opts.headers)

# Test POST
data = {
    "name": "tester",
    "email": "testpost123@mail.com",
    "password": "mypassword"
}
response_post = requests.post('http://127.0.0.1:8889/api/auth/register', json=data)
print("POST Status:", response_post.status_code)
print("POST Body:", response_post.text)
