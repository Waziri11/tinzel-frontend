export async function securityLogin(request,role){
 await request.post('http://127.0.0.1:5078/__test__/reset-otp-limits');
 const response=await request.post('/api/staff/login',{headers:{Cookie:''},data:{email:`${role}@example.test`,password:'Browser!2026'}});if(!response.ok())throw new Error(await response.text());
 let data=await response.json(),final=response;
 if(data.otpRequired){const message=await (await request.get(`http://127.0.0.1:5078/__test__/otp/${data.challengeId}`)).json();final=await request.post('/api/staff/otp/verify',{data:{challengeId:data.challengeId,code:message.code}});if(!final.ok())throw new Error(await final.text());}
 return final.headers()['set-cookie'].split(';')[0].split('=')[1];
}
