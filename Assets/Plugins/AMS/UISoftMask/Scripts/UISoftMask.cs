using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace AMS.UI.SoftMask
{
    using static UISoftMaskUtils;

    [ExecuteAlways, HelpURL("https://ams.sorialexandre.tech/ui-soft-mask/")]
    public class UISoftMask : RectUV
    {
        [SerializeField] private Sprite m_Mask;

        public Sprite mask
        {
            get => m_Mask;
            set
            {
                if (m_Mask == value)
                    return;

                m_Mask = value;
                ComputeFinalMaskForRendering();
            }
        }

#if UNITY_EDITOR || DEVELOPMENT_BUILD
        [SerializeField,
         Tooltip("Preview mask output.")]
        private bool m_MaskPreview;

        /// <summary>
        /// Enable/disable mask preview for debugging purposes. (Editor or Development Build only)
        /// </summary>
        public bool maskPreview
        {
            get => m_MaskPreview || m_MaskData.preview;
            set
            {
                m_MaskData.preview = value; //We want to isolate it for child mask preview purpose
                UpdateMaterials();
            }
        }
#endif

        [SerializeField, Tooltip("The mask output size.\n\nNote: Keep it low to save memory allocation.")]
        private MaskSize m_MaskSize = MaskSize._128;

        public MaskSize maskSize
        {
            get => m_MaskSize;

            set
            {
                if (m_MaskSize == value)
                    return;

                m_MaskSize = value;
                ComputeFinalMaskForRendering();
            }
        }

        [SerializeField, Tooltip("Select between a Simple or a Sliced (9-slicing) uv coordinate.")]
        private MaskUV m_MaskUV = MaskUV.Simple;

        public MaskUV maskUV => m_MaskUV;

        [SerializeField, Min(0.01f)] private float m_PixelsPerUnitMultiplier = 1;

        public float pixelsPerUnitMultiplier
        {
            get => m_PixelsPerUnitMultiplier;
            set
            {
                if (Mathf.Approximately(m_PixelsPerUnitMultiplier, value))
                    return;

                m_PixelsPerUnitMultiplier = value;
                ComputeFinalMaskForRendering();
            }
        }

        private readonly MaskData m_MaskData = new MaskData();

        [SerializeField, Range(0, 1)] private float m_FallOff = 1;

        public float fallOff
        {
            get => m_FallOff;
            set
            {
                m_FallOff = value;
                ComputeFinalMaskForRendering();
            }
        }

        [SerializeField, Range(0, 1)] private float m_Opacity = 1;

        public float opacity
        {
            get => m_Opacity;
            set
            {
                m_Opacity = value;
                ComputeFinalMaskForRendering();
            }
        }

        [SerializeField,
         Tooltip(
             "Use this to override the temporary mask material with a material asset from your project. Note: It requires a unique material per mask and the shader must be compatible with AMS UI Soft Mask.")]
        private Material m_OverrideMaskMaterial;

        private bool m_UsingOverrideMaterial;

        /// <summary>
        /// Use this to override the temporary mask material with a material asset from your project. Note: It requires a unique material per mask and the shader must be compatible with AMS UI Soft Mask. 
        /// </summary>
        public Material overrideMaterial
        {
            get => m_OverrideMaskMaterial;
            set
            {
                m_OverrideMaskMaterial = value;
                UpdateMaskSetup();
            }
        }

        [SerializeField, Tooltip("Override transform to decouple mask size, position and rotation.")]
        private RectTransform m_OverrideTransform;

        /// <summary>
        /// Override transform to decouple mask size, position and rotation.
        /// </summary>
        public RectTransform overrideTransform
        {
            get => m_OverrideTransform ? m_OverrideTransform : rectTransform;

            set
            {
                if (m_OverrideTransform == value)
                    return;

                m_OverrideTransform = value;
                UpdateMaskSetup();
            }
        }

        private RenderTexture m_MaskForRenderingRT;

        [Space(5)] private HashSet<MaskableGraphic> m_MaskableObjects = new();

        /// <summary>
        /// Return mask maskable objects.
        /// </summary>
        public HashSet<MaskableGraphic> maskableObjects => m_MaskableObjects;

        private readonly List<Material> m_ExternalMaterials = new();

        private Material m_SoftMaskBlitMaterial;

        private Material m_TempMaterial;

        private readonly Dictionary<TMP_Asset, Material> m_TMPFontAssets = new();

        internal List<Material> invalidFontMaterials => m_TMPFontAssets.Keys
            .Where(mKey => !MaterialHasSoftMask(mKey.material)).Select(mKey => mKey.material).ToList();

        private void Awake() => ResetSetup();

        private void Reset() => ResetSetup();

        private new void OnEnable()
        {
            base.OnEnable();

            m_OnBeginContextRendering = OnBeginFrameRendering;
            m_DuringCameraPreRender = DuringCameraPreRender;

            //Initial setup
            CheckType();
            CheckTargetMaterial();
            UpdateMaskSetup();
        }

        private new void OnDisable()
        {
            base.OnDisable();

            //Make sure to reset external materials
            m_MaskData.settings = Vector2.zero;
            m_ExternalMaterials.ForEach(externalMaterial =>
                externalMaterial.SetVector(s_MaskDataSettingsID, m_MaskData.settings));

            var childMasks = GetComponentsInChildren<UISoftMask>().ToList();
            childMasks.Remove(this);
            childMasks.ForEach(c => c.UpdateMaskSetup());

            ResetSetup();

            // UpdateMaskSetup(); //Required for external materials?
        }

        private void OnDestroy()
        {
            if (m_MaskForRenderingRT)
                RenderTexture.ReleaseTemporary(m_MaskForRenderingRT);

            DestroyImmediate(m_TempMaterial);
            DestroyImmediate(m_SoftMaskBlitMaterial);
        }

        private void OnValidate()
        {
            if (enabled)
                UpdateMaskSetup();
        }

        private void LateUpdate()
        {
            if (HasChangedRectUV(overrideTransform) || CheckType())
                ComputeFinalMaskForRendering();

            CheckMaskableObjects();
            UpdateMaterials();
        }

        private void UpdateMaterials()
        {
            CheckTargetMaterial();

            m_MaskData.settings.x = enabled ? 1 : 0;
            m_MaskData.settings.y = m_RectProperties.gamma2linear ? 1 : 0;

            if (m_UsingOverrideMaterial)
                m_TempMaterial.CopyPropertiesFromMaterial(m_OverrideMaskMaterial);

            UpdateMaterial(m_TempMaterial);

            foreach (var fontPair in m_TMPFontAssets)
                UpdateMaterial(fontPair.Value);

            foreach (var externalMaterial in m_ExternalMaterials)
                UpdateMaterial(externalMaterial);
        }

        private void SetWorldCanvasMaterials() => SetWorldCanvasProperty(1);

        private void SetOverlayCanvasMaterials() => SetWorldCanvasProperty(0);

        private void SetWorldCanvasProperty(int value)
        {
            if (m_TempMaterial)
                m_TempMaterial.SetInt(s_WORLDCANVAS, value);

            foreach (var fontPair in m_TMPFontAssets)
                if (fontPair.Value is { } fontMaterial)
                    fontMaterial.SetInt(s_WORLDCANVAS, value);

            foreach (var externalMaterial in m_ExternalMaterials)
                if (externalMaterial)
                    externalMaterial.SetInt(s_WORLDCANVAS, value);
        }

        private void OnBeginFrameRendering(List<Camera> cameras)
        {
            if (canvas && (canvas.renderMode == RenderMode.ScreenSpaceOverlay ||
                           (canvas.renderMode == RenderMode.ScreenSpaceCamera &&
                            !canvas.worldCamera)))
            {
                SetOverlayCanvasMaterials();
#if UNITY_EDITOR
                foreach (var cam in cameras)
                    if (cam.cameraType != CameraType.Game)
                        SetWorldCanvasMaterials();
#endif
            }
            else
                SetWorldCanvasMaterials();
        }

        private void DuringCameraPreRender(Camera targetCamera)
        {
            if (canvas && (canvas.renderMode == RenderMode.ScreenSpaceOverlay ||
                           (canvas.renderMode == RenderMode.ScreenSpaceCamera &&
                            !canvas.worldCamera)))
            {
#if UNITY_EDITOR
                if (targetCamera.cameraType == CameraType.SceneView)
                    SetWorldCanvasMaterials();
                else
#endif
                    SetOverlayCanvasMaterials();
            }
            else
                SetWorldCanvasMaterials();
        }

        private void UpdateMaterial(Material material)
        {
            if (!material)
                return;

            material.SetTexture(s_SoftMaskID, m_MaskForRenderingRT);
            SetMaterialRectParams(material);
            m_MaskData.SetMaterialDataSettings(material);
#if UNITY_EDITOR || DEVELOPMENT_BUILD
            if (maskPreview)
                material.EnableKeyword(k_DEBUG_MASK);
            else
                material.DisableKeyword(k_DEBUG_MASK);
#endif
        }

        /// <summary>
        /// Force update mask setup.
        /// </summary>
        public void UpdateMaskSetup()
        {
            CheckMaskableObjects();
            ComputeFinalMaskForRendering();
        }

        private bool CheckType()
        {
            var update = false;
            switch (m_MaskUV)
            {
                case MaskUV.Simple:
                    if (m_MaskData.uvType != m_MaskUV)
                    {
                        m_MaskData.uvType = m_MaskUV;
                        update = true;
                    }

                    break;

                case MaskUV.Sliced:
                    if (m_MaskData.uvType != m_MaskUV ||
                        m_Mask && (!m_MaskData.sprite || m_MaskData.sprite != m_Mask) ||
                        !Mathf.Approximately(m_MaskData.pixelsPerUnitMultiplier, m_PixelsPerUnitMultiplier))
                    {
                        m_MaskData.uvType = m_MaskUV;

                        var sprite = m_MaskData.sprite = m_Mask;

                        var size = new Vector2(sprite.rect.width, sprite.rect.height);
                        var borders = sprite.border;
                        borders.x /= size.x;
                        borders.y /= size.y;
                        borders.z /= size.x;
                        borders.w /= size.y;

                        m_MaskData.slicedBorder = borders;
                        m_MaskData.pixelsPerUnitMultiplier = m_PixelsPerUnitMultiplier;

                        update = true;
                    }

                    break;
            }

            return update;
        }

        private Vector2 GetSliceScale(Vector2 textureSize) =>
            rectTransform.rect.size / textureSize * m_MaskData.pixelsPerUnitMultiplier;

        private void CheckRenderingMaskSetup()
        {
            if (!m_SoftMaskBlitMaterial)
            {
                if (!s_SoftMaskBlitShader)
                    s_SoftMaskBlitShader = Shader.Find(k_SoftMaskBlitShader);

                m_SoftMaskBlitMaterial = new Material(s_SoftMaskBlitShader);
                m_SoftMaskBlitMaterial.name = $"SoftMaskBlit [{m_SoftMaskBlitMaterial.GetInstanceID()}]";
            }

            var selectedSize = (int)m_MaskSize;

            if (!m_MaskForRenderingRT)
            {
                m_MaskForRenderingRT =
                    RenderTexture.GetTemporary(selectedSize, selectedSize, 0,
                        RenderTextureFormat.R16); //R8 is unsupported for some platforms
                m_MaskForRenderingRT.name = $"SoftMask [{m_MaskForRenderingRT.GetInstanceID()}]";
                m_MaskForRenderingRT.Release();
                m_MaskForRenderingRT.autoGenerateMips = false;
                m_MaskForRenderingRT.useMipMap = false;
            }
            else if (m_MaskForRenderingRT && m_MaskForRenderingRT.width != selectedSize)
            {
                m_MaskForRenderingRT.Release();
                m_MaskForRenderingRT.width = selectedSize;
                m_MaskForRenderingRT.height = selectedSize;
            }
        }

        private void CheckMaskableObjects()
        {
            var childMasks = GetComponentsInChildren<UISoftMask>(true).ToList();
            childMasks.Remove(this);

            var newMaskableObjects = GetComponentsInChildren<MaskableGraphic>(true)
                .Where(obj =>
                {
                    return obj.maskable &&
                           childMasks.All(cm => !cm.enabled || !obj.transform.IsChildOf(cm.transform));
                })
                .ToHashSet();

            if (newMaskableObjects.SetEquals(m_MaskableObjects))
            {
                CheckMaskableObjectsMaterial();
                return;
            }

            // Make sure to reset and remove unlisted objects
            foreach (var obj in m_MaskableObjects)
            {
                if (!obj || newMaskableObjects.Contains(obj))
                    continue;

                if (obj is TMP_Text textMeshToRemove && m_TMPFontAssets.ContainsKey(textMeshToRemove.font))
                {
                    m_TMPFontAssets.Remove(textMeshToRemove.font);
                    textMeshToRemove.fontSharedMaterial = textMeshToRemove.font.material;
                }

                if (obj.material == m_TempMaterial)
                    obj.material = null;
            }

            m_MaskableObjects = newMaskableObjects;
            CheckMaskableObjectsMaterial();
        }

        private void CheckMaskableObjectsMaterial()
        {
            m_ExternalMaterials.Clear();

            foreach (var maskableObj in m_MaskableObjects)
            {
                if (maskableObj is TMP_Text textMesh)
                    CheckTMPObject(textMesh);
                else if (maskableObj.material is { } material)
                {
                    if (material == maskableObj.defaultMaterial) // Unity default UI
                        maskableObj.material = m_TempMaterial;
                    else if (material != m_TempMaterial &&
                             material.name.StartsWith(k_SoftMaskMatTag)) // Persistant prefab material
                        maskableObj.material = m_TempMaterial;
                    else if (material != m_TempMaterial && MaterialHasSoftMask(material)) // Register external material
                        m_ExternalMaterials.Add(material);
                }
            }
        }

        private void CheckTMPObject(TMP_Text textMesh)
        {
            if (!m_TMPFontAssets.ContainsKey(textMesh.font))
            {
                if (!MaterialHasSoftMask(textMesh.font.material))
                    return;

                var fontMat = new Material(textMesh.font.material);
                fontMat.name = $"SoftMaskFontMat [{fontMat.GetInstanceID()}]";
                fontMat.hideFlags = HideFlags.DontSaveInBuild | HideFlags.DontSaveInEditor |
                                    HideFlags.NotEditable;
                textMesh.fontSharedMaterial = fontMat;
                m_TMPFontAssets.Add(textMesh.font, fontMat);
            }
            else
            {
                if (!m_TMPFontAssets.TryGetValue(textMesh.font, out var fontSharedMaterial))
                    return;

                if (textMesh.font.material is { } fontMaterial && (textMesh.havePropertiesChanged ||
                                                                   fontSharedMaterial.shader != fontMaterial.shader))
                {
                    fontSharedMaterial.shader = fontMaterial.shader;
                    fontSharedMaterial.CopyPropertiesFromMaterial(fontMaterial);
                }

                textMesh.fontSharedMaterial = fontSharedMaterial;
            }
        }

        private void ComputeFinalMaskForRendering()
        {
            CheckRenderingMaskSetup();

            m_SoftMaskBlitMaterial.SetFloat(s_OpacityID, m_Opacity);
            m_SoftMaskBlitMaterial.SetFloat(s_FalloffID, m_FallOff);
            var textureMask = Texture2D.whiteTexture;

            RenderTexture parentTex = null;
            var parentMatrix = Matrix4x4.identity;
            //Get parent mask
            var parentMasks = GetComponentsInParent<UISoftMask>().ToList();
            parentMasks.Remove(this);
            if (parentMasks.Count > 0)
                foreach (var parentMask in parentMasks)
                    if (parentMask.enabled)
                    {
                        GetTemporaryParentMask(parentMask, out parentTex, out parentMatrix);
                        break;
                    }

            if (m_Mask)
            {
                var sourceTexRect = m_Mask.rect;
                var texRect = m_Mask.textureRect;
                var rectOffset = m_Mask.textureRectOffset;
                textureMask = m_Mask.texture;
                var textureAtlasFactor = Vector2.one / new Vector2(textureMask.width, textureMask.height);
                var spriteOffset = (texRect.min - rectOffset) * textureAtlasFactor;
                Vector4 atlasData = sourceTexRect.size * textureAtlasFactor;
                atlasData.z = spriteOffset.x;
                atlasData.w = spriteOffset.y;
                m_SoftMaskBlitMaterial.SetVector(s_AtlasDataID, atlasData);

                if (maskUV == MaskUV.Sliced)
                {
                    m_SoftMaskBlitMaterial.EnableKeyword(k_SLICED);
                    m_SoftMaskBlitMaterial.SetVector(s_SliceScaleID, GetSliceScale(sourceTexRect.size));
                    m_SoftMaskBlitMaterial.SetVector(s_SliceBorderID, m_MaskData.slicedBorder);
                }
                else
                    m_SoftMaskBlitMaterial.DisableKeyword(k_SLICED);
            }

            m_SoftMaskBlitMaterial.SetMatrix(s_ParentMaskMatrixID, parentMatrix);
            m_SoftMaskBlitMaterial.SetTexture(s_ParentMaskID, parentTex ? parentTex : Texture2D.whiteTexture);
            Graphics.Blit(textureMask, m_MaskForRenderingRT, m_SoftMaskBlitMaterial);

            if (parentTex)
                RenderTexture.ReleaseTemporary(parentTex);

            // Compute children mask
            var childMasks = GetComponentsInChildren<UISoftMask>().ToList();
            childMasks.Remove(this);
            if (childMasks.Count <= 0)
                return;

            foreach (var c in childMasks.Where(c => !childMasks.Any(x => x != c && c.transform.IsChildOf(x.transform))))
            {
                c.UpdateMaskSetup();
#if UNITY_EDITOR || DEVELOPMENT_BUILD
                c.maskPreview = maskPreview;
#endif
            }
        }

        private void GetTemporaryParentMask(UISoftMask parentMask, out RenderTexture parentTex,
            out Matrix4x4 overrideMatrix)
        {
            parentTex = RenderTexture.GetTemporary(m_MaskForRenderingRT.descriptor);
            parentTex.name = $"ParentSoftMask [{name}]";

            var parentTransform = parentMask.overrideTransform ?? parentMask.rectTransform;
            var childTransform = m_OverrideTransform ? m_OverrideTransform : rectTransform;

            var parentCenterWorld = parentTransform.TransformPoint(parentTransform.rect.center);
            var childCenterWorld = childTransform.TransformPoint(childTransform.rect.center);
            var offsetWorld = childCenterWorld - parentCenterWorld;

            var parentRight = parentTransform.right;
            var parentUp = parentTransform.up;

            var offset = new Vector2(
                Vector3.Dot(offsetWorld, parentRight),
                Vector3.Dot(offsetWorld, parentUp)
            );

            var parentSize = parentTransform.rect.size * parentTransform.lossyScale;
            var maxSize = Mathf.Max(parentSize.x, parentSize.y);
            var squareSize = new Vector2(maxSize, maxSize);
            offset /= squareSize;

            parentSize = squareSize / parentSize;
            var childSize = childTransform.rect.size * childTransform.lossyScale;
            var scale = childSize / squareSize;

            m_SoftMaskBlitMaterial.DisableKeyword(k_SLICED);
            m_SoftMaskBlitMaterial.SetMatrix(s_ParentMaskMatrixID, Matrix4x4.Scale(parentSize));
            m_SoftMaskBlitMaterial.SetTexture(s_ParentMaskID, parentMask.m_MaskForRenderingRT);
            Graphics.Blit(Texture2D.whiteTexture, parentTex, m_SoftMaskBlitMaterial);

            var rotationDelta = Quaternion.Inverse(parentTransform.rotation) * childTransform.rotation;
            overrideMatrix = Matrix4x4.TRS(offset, rotationDelta, scale);
        }

        private void CheckTargetMaterial()
        {
            if (!m_TempMaterial)
            {
                m_TempMaterial = new Material(s_SoftMaskShader);
                m_TempMaterial.name = $"{k_SoftMaskMatTag}{m_TempMaterial.GetInstanceID()}]";
                m_TempMaterial.hideFlags =
                    HideFlags.DontSaveInBuild | HideFlags.DontSaveInEditor | HideFlags.NotEditable;
            }

            m_UsingOverrideMaterial = m_OverrideMaskMaterial && MaterialHasSoftMask(m_OverrideMaskMaterial);

            switch (m_UsingOverrideMaterial)
            {
                case true when
                    m_OverrideMaskMaterial.GetInstanceID() is var overrideID &&
                    (m_TempMaterial.shader != m_OverrideMaskMaterial.shader || //Listen to valid override shader change 
                     !m_TempMaterial.name.Contains(overrideID.ToString())):
                    m_TempMaterial.shader = m_OverrideMaskMaterial.shader;
                    m_TempMaterial.name =
                        $"{m_OverrideMaskMaterial.name}:{k_SoftMaskMatTag}{overrideID}]";
                    break;
                case false when m_TempMaterial.GetInstanceID() is var tempID &&
                                !m_TempMaterial.name.Contains(tempID.ToString()):
                    m_TempMaterial.shader = s_SoftMaskShader;
                    m_TempMaterial.name = $"{k_SoftMaskMatTag}{tempID}]";
                    break;
            }
        }

        private void ResetSetup()
        {
            m_TempMaterial = null;
            m_MaskForRenderingRT = null;

            CheckMaskableObjects();
        }
    }
}