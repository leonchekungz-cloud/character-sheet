export async function onRequestPost(context) {
  try {
    const { image, prompt, size } = await context.request.json();
    if (!image) return Response.json({error:"Reference image is required."},{status:400});

    const apiKey = context.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({error:"OPENAI_API_KEY belum dipasang di Cloudflare."},{status:500});

    const match=image.match(/^data:(.+);base64,(.+)$/);
    if (!match) return Response.json({error:"Format gambar tidak valid."},{status:400});

    const mimeType=match[1], base64Data=match[2];
    const binary=atob(base64Data);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);

    const form=new FormData();
    form.append("model","gpt-image-2.5-sunburst");
    form.append("image[]",new Blob([bytes],{type:mimeType}),"reference.png");
    form.append("prompt",prompt || "Create a photorealistic identity sheet from the reference image.");
    form.append("size",size || "1536x1024");
    form.append("quality","high");
    form.append("output_format","png");

    const response=await fetch("https://api.openai.com/v1/images/edits",{
      method:"POST",
      headers:{Authorization:`Bearer ${apiKey}`},
      body:form
    });
    const data=await response.json();
    if(!response.ok) return Response.json({error:data?.error?.message||"Image generation failed."},{status:response.status});

    const b64=data?.data?.[0]?.b64_json;
    if(!b64) return Response.json({error:"No image was returned."},{status:500});
    return Response.json({image:`data:image/png;base64,${b64}`});
  } catch(e) {
    return Response.json({error:e?.message||"Server error."},{status:500});
  }
}
export async function onRequest(context){
  if(context.request.method==="POST") return onRequestPost(context);
  return Response.json({error:"Method not allowed."},{status:405});
}
