//UISoftMask (Shader Graph) by Alexandre Soria http://sorialexandre.tech
#include_with_pragmas "UISoftMask.hlsl"

///RectUV (ShaderGraph): float3 wPos, out float4 rectUV
void RectUV_float(float3 wPos, out float2 rectUV)
{
    rectUV = RectUV(float4(wPos, 1));
}

///UISoftMask (ShaderGraph): float4 rectUV, UnityTexture2D maskSampler, float alpha, out float softMask
void UISoftMask_float(float2 rectUV, UnityTexture2D maskSampler, float alpha, out float softMask)
{
    float2 uv = rectUV.xy;
    float2 trimUV = saturate((1 - max(uv, 1 - uv)) * 1000);
    half mask = SAMPLE_TEXTURE2D(maskSampler, maskSampler.samplerstate, uv).r * trimUV.x * trimUV.y;

    half softMaskFactor = _MaskDataSettings.x * mask;
    softMask = alpha * (softMaskFactor + (1 - _MaskDataSettings.x));
}